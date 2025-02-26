import React, { useState, useEffect } from "react";
import { fetchArticles, fetchCategories } from "../utils/api";
import "./ArticleList.css"; // Import CSS file

const ArticleList = () => {
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [category, setCategory] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchArticles(category, search).then(setArticles);
        fetchCategories().then(setCategories);
    }, [category, search]);

    return (
        <div className="article-container">
            <h2 className="title">Educational Articles</h2>

            <div className="filter-section">
                <input
                    type="text"
                    placeholder="Search articles..."
                    className="search-bar"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select className="category-select" onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div className="article-grid">
                {articles.length > 0 ? (
                    articles.map((article) => (
                        <div key={article.id} className="article-card">
                            {article.image_url && <img src={article.image_url} alt="Article" className="article-image" />}
                            <div className="article-content">
                                <h3 className="article-title">{article.title}</h3>
                                <p className="article-summary">{article.content.substring(0, 100)}...</p>
                                <a href={article.url} className="read-more" target="_blank" rel="noopener noreferrer">
                                    Read More →
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
