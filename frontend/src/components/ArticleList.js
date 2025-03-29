import React, { useState, useEffect } from "react";
import { fetchArticles, fetchCategories } from "../utils/api";
import "./ArticleList.css";

const ArticleList = () => {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [resultsCount, setResultsCount] = useState(0);

  // Helper function to clean HTML tags from content
  const clean_html = (html) => {
    return html.replace(/<[^>]*>/g, "");
  };

  useEffect(() => {
    fetchArticles(category, search).then((data) => {
      // Filter out articles with no meaningful content
      const filteredArticles = data.filter((article) => {
        const content = article.content ? clean_html(article.content).trim() : "";
        return (
          content &&
          content !== "..." &&
          content !== "" &&
          !article.content.includes("No summary available")
        );
      });
      setArticles(filteredArticles);
      setResultsCount(filteredArticles.length);
    });
    fetchCategories().then(setCategories);
  }, [category, search]);

  return (
    <div className="article-container">
      <h2 className="title">Stay Informed, Stay Healthy</h2>
      <p className="subtitle">
        Explore research-backed articles on women's health, wellness, and more.
      </p>

      <div className="filter-section" data-results={resultsCount}>
  <input
    type="text"
    placeholder="Search articles..."
    className="search-bar"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
  <select
    className="category-select"
    onChange={(e) => setCategory(e.target.value)}
  >
    <option value="">All Categories</option>
    {categories.map((cat) => (
      <option key={cat.id} value={cat.name}>
        {cat.name}
      </option>
    ))}
  </select>
</div>

      <div className="article-grid">
        {articles.length > 0 ? (
          articles.map((article) => (
            <div key={article.id} className="article-card">
              <div
                className="article-content"
                data-category={article.categories[0]?.name || "General"}
              >
                <h3 className="article-title">{article.title}</h3>
                <p className="article-summary">
                  {article.content
                    ? clean_html(article.content).substring(0, 100) + "..."
                    : "Learn more about this topic..."}
                </p>
                <a
                  href={article.url}
                  className="read-more"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read More
                </a>
              </div>
            </div>
          ))
        ) : (
          <p className="no-articles">No articles found.</p>
        )}
      </div>
    </div>
  );
};

export default ArticleList;