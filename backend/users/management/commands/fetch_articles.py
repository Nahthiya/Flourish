import requests
from django.core.management.base import BaseCommand
from users.models import Article, Category
from django.utils.timezone import now
import re

# API Endpoints
APIS = {
    "healthfinder": "https://health.gov/myhealthfinder/api/v3/topicsearch.json",
    "wikipedia": "https://en.wikipedia.org/w/api.php"
}

# Expanded Keywords from the Document
EXPANDED_KEYWORDS = [
    "Women's health", "Maternal health", "Pregnancy care", "Breast cancer awareness", "Reproductive health", 
    "Menstrual health", "PCOS", "Endometriosis", "Fibroids", "Osteoporosis prevention", "Heart health",
    "Cervical cancer", "HPV vaccine", "Menopause", "Sexual health", "Infertility treatments", "Prenatal nutrition",
    "Mental health", "Depression", "Anxiety", "Stress management", "Self-care", "Burnout recovery", "Mindfulness",
    "Postpartum depression", "Meditation", "Cognitive behavioral therapy", "PTSD in women", "Emotional intelligence",
    "Self-love", "Confidence", "Healthy relationships", "Yoga for balance", "Sound healing", "Aromatherapy",
    "Intermittent fasting", "Holistic wellness", "Hydration", "Healthy gut", "Social well-being"
]

# Category Mapping
CATEGORY_MAPPING = {
    "Physical Health": ["pregnancy", "breast cancer", "reproductive health", "osteoporosis", "heart health"],
    "Mental Health": ["depression", "anxiety", "stress", "PTSD", "CBT"],
    "Emotional Well-being": ["self-care", "mindfulness", "confidence", "healthy relationships", "yoga"],
    "Nutrition & Wellness": ["nutrition", "hydration", "gut health", "superfoods", "herbal remedies"]
}

# Function to remove HTML tags
import html

from bs4 import BeautifulSoup

def clean_html(raw_html):
    """ Removes all HTML tags and unescapes HTML entities properly """
    soup = BeautifulSoup(raw_html, "html.parser")
    clean_text = soup.get_text(separator=" ")  # Extracts visible text and maintains spacing
    return clean_text.strip()

class Command(BaseCommand):
    help = "Fetch articles from HealthFinder and Wikipedia and store them in the database"

    def handle(self, *args, **kwargs):
        self.fetch_healthfinder_articles()
        self.fetch_wikipedia_articles()

    def fetch_healthfinder_articles(self):
        """ Fetch articles from HealthFinder API and store them """
        for keyword in EXPANDED_KEYWORDS:
            params = {
                "lang": "en",
                "keyword": keyword,
            }

            try:
                response = requests.get(APIS["healthfinder"], params=params, timeout=30)
                if response.status_code != 200:
                    self.stdout.write(self.style.WARNING(f"⚠ HealthFinder API returned {response.status_code}. Skipping."))
                    continue

                data = response.json()
                articles = data.get("Result", {}).get("Resources", {}).get("Resource", [])

                for item in articles:
                    title = item.get("Title", "")[:200]  # ✅ Limit title to 200 characters
                    if Article.objects.filter(title=title, source="HealthFinder").exists():
                        continue  # Skip duplicates

                    summary = clean_html(item.get("Sections", {}).get("Section", [{}])[0].get("Content", ""))
                    url = item.get("AccessibleVersion", "")[:200]  # ✅ Limit URL to 200 characters
                    image_url = item.get("ImageUrl", None)
                    if image_url:
                        image_url = image_url[:200]  # ✅ Limit image URL to 200 characters
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
                            "keywords": ", ".join(EXPANDED_KEYWORDS[:5])  # ✅ Limit keywords to first 5
                        }
                    )
                    if created:
                        article.categories.add(category)

                self.stdout.write(self.style.SUCCESS(f"✅ Successfully fetched HealthFinder articles for keyword: {keyword}"))

            except requests.RequestException as e:
                self.stdout.write(self.style.ERROR(f"❌ Error fetching from HealthFinder for {keyword}: {e}"))

    def fetch_wikipedia_articles(self):
        """ Fetch articles from Wikipedia API in batches of 10 keywords """
        batch_size = 10
        for i in range(0, len(EXPANDED_KEYWORDS), batch_size):
            params = {
                "action": "query",
                "format": "json",
                "prop": "extracts|pageimages",
                "exintro": True,
                "piprop": "thumbnail",
                "titles": "|".join(EXPANDED_KEYWORDS[i:i+batch_size])
            }

            try:
                response = requests.get(APIS["wikipedia"], params=params, timeout=30)
                if response.status_code != 200:
                    self.stdout.write(self.style.WARNING(f"⚠ Wikipedia API returned {response.status_code}. Skipping batch."))
                    continue

                data = response.json()
                pages = data.get("query", {}).get("pages", {})

                for page_id, page_info in pages.items():
                    title = page_info.get("title", "")[:200]  # ✅ Limit title to 200 characters
                    if Article.objects.filter(title=title, source="Wikipedia").exists():
                        continue  # Skip duplicates

                    summary = clean_html(page_info.get("extract", "No summary available."))
                    url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"[:200]  # ✅ Limit URL to 200 characters
                    image_url = page_info.get("thumbnail", {}).get("source", None)
                    if image_url:
                        image_url = image_url[:200]  # ✅ Limit image URL to 200 characters
                    published_date = now()
                    
                    category, _ = Category.objects.get_or_create(name="Education")

                    article, created = Article.objects.get_or_create(
                        title=title,
                        source="Wikipedia",
                        defaults={
                            "url": url,
                            "content": summary[:300] + "...",
                            "published_date": published_date,
                            "image_url": image_url,
                            "keywords": ", ".join(EXPANDED_KEYWORDS[:5])  # ✅ Limit keywords to first 5
                        }
                    )
                    if created:
                        article.categories.add(category)

                self.stdout.write(self.style.SUCCESS(f"✅ Successfully fetched Wikipedia articles for batch {i//batch_size + 1}"))

            except requests.RequestException as e:
                self.stdout.write(self.style.ERROR(f"❌ Error fetching from Wikipedia for batch {i//batch_size + 1}: {e}"))
