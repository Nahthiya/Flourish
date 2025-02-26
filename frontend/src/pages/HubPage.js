import React from "react";
import ArticleList from "../components/ArticleList";

const HubPage = () => {
    return (
        <div className="hub-container">
            <h1 className="text-3xl font-bold text-center mt-6">Educational Hub</h1>
            <ArticleList />
        </div>
    );
};

export default HubPage;
