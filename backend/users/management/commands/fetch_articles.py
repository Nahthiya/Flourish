import requests
from django.core.management.base import BaseCommand
from users.models import Article, Category
from django.utils.timezone import now
import re
import html
from bs4 import BeautifulSoup
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Endpoints
APIS = {
    "healthfinder": "https://health.gov/myhealthfinder/api/v3/topicsearch.json",
    "wikipedia": "https://en.wikipedia.org/w/api.php",
    "pubmed": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
    "pubmed_fetch": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
}

# Focused Keywords
EXPANDED_KEYWORDS = [
    # Mental Well-being
    "Mental health", "Depression in women", "Anxiety in women", "Stress management for women", 
    "Self-care for women", "Postpartum depression", "Mindfulness for women", "Emotional well-being",
    "Burnout recovery in women", "PTSD in women", "Cognitive behavioral therapy for women",
    "Self-love for women", "Confidence in women", "Healthy relationships for women", "Yoga for mental health",
    
    # Physical Health: Pregnancy and Menstruation
    "Pregnancy care", "Maternal health", "Prenatal nutrition", "Postpartum care", 
    "Menstrual health", "PCOS", "Endometriosis", "Fibroids", "Menopause symptoms", 
    "Cervical health", "HPV and pregnancy", "Infertility treatments", "Menstrual cycle tracking",
    "Pregnancy complications", "Menstruation pain management", "Hormonal health in women",
    
    # General Health
    "Women’s health basics", "General wellness for women", "Healthy lifestyle for women", 
    "Nutrition for women", "Exercise for women", "Health tips for women", "Women’s wellness",
    
    # Emotional Well-being (Fallback)
    "Emotional health", "Well-being for women"
]

# Category Mapping
CATEGORY_MAPPING = {
    "Mental Well-being": [
        "mental health", "depression", "anxiety", "stress", "self-care", "postpartum depression", 
        "mindfulness", "burnout", "ptsd", "cbt", "self-love", "confidence", "relationships", "yoga"
    ],
    "Physical Health": [
        "pregnancy", "maternal health", "prenatal", "postpartum", "menstrual health", "pcos", 
        "endometriosis", "fibroids", "menopause", "cervical", "hpv", "infertility", "menstruation", 
        "hormonal health"
    ],
    "Emotional Well-being": [
        "self-care", "mindfulness", "confidence", "healthy relationships", "yoga", "emotional well-being",
        "emotional health", "well-being"
    ],
    "General Health": [
        "women’s health", "general wellness", "healthy lifestyle", "nutrition", "exercise", 
        "health tips", "wellness"
    ]
}

# Function to remove HTML tags
def clean_html(raw_html):
    """ Removes all HTML tags and unescapes HTML entities properly """
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    clean_text = soup.get_text(separator=" ") 
    return clean_text.strip()

class Command(BaseCommand):
    help = "Fetch articles from HealthFinder, Wikipedia, and PubMed and store them in the database"

    def handle(self, *args, **kwargs):
        logger.info("Starting article fetch process...")
        self.fetch_healthfinder_articles()
        self.fetch_wikipedia_articles()
        self.fetch_pubmed_articles()
        logger.info("Article fetch process completed.")

    def fetch_with_retries(self, url, params, retries=3, delay=1):
        """ Fetch data from an API with retries on failure """
        for attempt in range(retries):
            try:
                response = requests.get(url, params=params, timeout=30)
                response.raise_for_status() 
                return response
            except requests.RequestException as e:
                logger.warning(f"Attempt {attempt + 1}/{retries} failed for {url}: {e}")
                if attempt < retries - 1:
                    time.sleep(delay * (2 ** attempt))  
                else:
                    logger.error(f"Failed to fetch from {url} after {retries} attempts: {e}")
                    return None

    def fetch_healthfinder_articles(self):
        """ Fetch articles from HealthFinder API and store them """
        logger.info("Fetching articles from HealthFinder...")
        for keyword in EXPANDED_KEYWORDS:
            params = {
                "lang": "en",
                "keyword": keyword,
            }

            response = self.fetch_with_retries(APIS["healthfinder"], params)
            if not response:
                logger.warning(f"Skipping HealthFinder fetch for keyword '{keyword}' due to repeated failures")
                continue

            logger.info(f"HealthFinder response status for '{keyword}': {response.status_code}")
            data = response.json()
            articles = data.get("Result", {}).get("Resources", {}).get("Resource", [])

            for item in articles:
                title = item.get("Title", "")[:200]  
                if Article.objects.filter(title=title, source="HealthFinder").exists():
                    logger.info(f"Skipping duplicate HealthFinder article: {title}")
                    continue

                summary = clean_html(item.get("Sections", {}).get("Section", [{}])[0].get("Content", ""))
                if not summary or summary.strip() == "" or summary.strip() == "...":
                    logger.info(f"Skipping HealthFinder article '{title}' due to empty or invalid summary")
                    continue

                url = item.get("AccessibleVersion", "")[:200]  
                image_url = item.get("ImageUrl", None)
                if image_url:
                    image_url = image_url[:200]  
                published_date = now()
                
                category_name = "General Health"
                for cat, keywords in CATEGORY_MAPPING.items():
                    if any(word in title.lower() or word in summary.lower() for word in keywords):
                        category_name = cat
                        break

                category, _ = Category.objects.get_or_create(name=category_name)

                article, created = Article.objects.get_or_create(
                    title=title,
                    source="HealthFinder",
                    defaults={
                        "url": url,
                        "content": summary,
                        "published_date": published_date,
                        "image_url": image_url,
                        "keywords": ", ".join(EXPANDED_KEYWORDS[:5])
                    }
                )
                if created:
                    article.categories.add(category)
                    logger.info(f"Added HealthFinder article: {title} (Category: {category_name})")

            logger.info(f"Successfully fetched HealthFinder articles for keyword: {keyword}")
            time.sleep(0.5)  

    def fetch_wikipedia_articles(self):
        """ Fetch articles from Wikipedia API in batches of 10 keywords """
        logger.info("Fetching articles from Wikipedia...")
        batch_size = 10
        for i in range(0, len(EXPANDED_KEYWORDS), batch_size):
            batch_keywords = EXPANDED_KEYWORDS[i:i+batch_size]
            params = {
                "action": "query",
                "format": "json",
                "prop": "extracts|pageimages",
                "exintro": True,
                "piprop": "thumbnail",
                "titles": "|".join(batch_keywords)
            }

            response = self.fetch_with_retries(APIS["wikipedia"], params)
            if not response:
                logger.warning(f"Skipping Wikipedia batch {i//batch_size + 1} due to repeated failures")
                continue

            logger.info(f"Wikipedia response status for batch {i//batch_size + 1}: {response.status_code}")
            data = response.json()
            pages = data.get("query", {}).get("pages", {})
            logger.info(f"Found {len(pages)} pages in batch {i//batch_size + 1}")

            for page_id, page_info in pages.items():
                title = page_info.get("title", "")[:200]  
                if Article.objects.filter(title=title, source="Wikipedia").exists():
                    logger.info(f"Skipping duplicate Wikipedia article: {title}")
                    continue

                summary = clean_html(page_info.get("extract", "No summary available."))
                if not summary or summary.strip() == "No summary available." or summary.strip() == "...":
                    logger.info(f"Skipping Wikipedia article '{title}' due to empty or invalid summary")
                    continue

                url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"[:200]  
                image_url = page_info.get("thumbnail", {}).get("source", None)
                if image_url:
                    image_url = image_url[:200]  
                published_date = now()
                
                category_name = "General Health"
                for cat, keywords in CATEGORY_MAPPING.items():
                    if any(word in title.lower() or word in summary.lower() for word in keywords):
                        category_name = cat
                        break

                category, _ = Category.objects.get_or_create(name=category_name)

                article, created = Article.objects.get_or_create(
                    title=title,
                    source="Wikipedia",
                    defaults={
                        "url": url,
                        "content": summary[:300] + "...",
                        "published_date": published_date,
                        "image_url": image_url,
                        "keywords": ", ".join(EXPANDED_KEYWORDS[:5])
                    }
                )
                if created:
                    article.categories.add(category)
                    logger.info(f"Added Wikipedia article: {title} (Category: {category_name})")

            logger.info(f"Successfully fetched Wikipedia articles for batch {i//batch_size + 1}")
            time.sleep(0.5)  # Delay to avoid rate limiting

    def fetch_pubmed_articles(self):
        """ Fetch articles from PubMed API and store them """
        logger.info("Fetching articles from PubMed...")
        for keyword in EXPANDED_KEYWORDS:
            # Search for articles
            search_params = {
                "db": "pubmed",
                "term": f"{keyword}[Title/Abstract]",
                "retmax": 15,  # Fetch up to 15 articles per keyword
                "retmode": "json",
                "usehistory": "y"
            }

            search_response = self.fetch_with_retries(APIS["pubmed"], search_params)
            if not search_response:
                logger.warning(f"Skipping PubMed search for keyword '{keyword}' due to repeated failures")
                continue

            logger.info(f"PubMed search response status for '{keyword}': {search_response.status_code}")
            search_data = search_response.json()
            id_list = search_data.get("esearchresult", {}).get("idlist", [])
            logger.info(f"Found {len(id_list)} articles for keyword '{keyword}'")

            if not id_list:
                logger.info(f"No articles found for keyword '{keyword}'")
                continue

            # Fetch article details
            fetch_params = {
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "xml"
            }
            fetch_response = self.fetch_with_retries(APIS["pubmed_fetch"], fetch_params)
            if not fetch_response:
                logger.warning(f"Skipping PubMed fetch for keyword '{keyword}' due to repeated failures")
                continue

            logger.info(f"PubMed fetch response status for '{keyword}': {fetch_response.status_code}")

            # Parse XML response
            from xml.etree import ElementTree as ET
            try:
                root = ET.fromstring(fetch_response.content)
                for article in root.findall(".//PubmedArticle"):
                    title = article.find(".//ArticleTitle")
                    title = clean_html(title.text) if title is not None and title.text else "No title"
                    title = title[:200]  # Limit title to 200 characters

                    if Article.objects.filter(title=title, source="PubMed").exists():
                        logger.info(f"Skipping duplicate PubMed article: {title}")
                        continue

                    abstract = article.find(".//AbstractText")
                    summary = clean_html(abstract.text) if abstract is not None and abstract.text else ""
                    if not summary or len(summary.strip()) < 5:
                        logger.info(f"Skipping PubMed article '{title}' due to empty or too short summary")
                        continue

                    pmid = article.find(".//PMID")
                    url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid.text}/" if pmid is not None else ""
                    url = url[:200]  # Limit URL to 200 characters
                    published_date = now()
                    
                    category_name = "General Health"
                    for cat, keywords in CATEGORY_MAPPING.items():
                        if any(word in title.lower() or word in summary.lower() for word in keywords):
                            category_name = cat
                            break

                    category, _ = Category.objects.get_or_create(name=category_name)

                    article, created = Article.objects.get_or_create(
                        title=title,
                        source="PubMed",
                        defaults={
                            "url": url,
                            "content": summary,
                            "published_date": published_date,
                            "image_url": None,
                            "keywords": ", ".join(EXPANDED_KEYWORDS[:5])
                        }
                    )
                    if created:
                        article.categories.add(category)
                        logger.info(f"Added PubMed article: {title} (Category: {category_name})")

                logger.info(f"Successfully fetched PubMed articles for keyword: {keyword}")
                time.sleep(0.5)  # Delay to avoid rate limiting

            except Exception as e:
                logger.error(f"Error parsing PubMed response for {keyword}: {e}")