import React from 'react';
import '../App.css'; // Or inline styles if preferred, but we will add to App.css

const ReviewPanel = ({ review, onClose, isLoading }) => {
    return (
        <div className="review-panel-container">
            <div className="review-header">
                <h2>⚡ AI Code Review</h2>
                <button className="btn close-btn" onClick={onClose}>✖</button>
            </div>

            <div className="review-content">
                {isLoading ? (
                    <div className="loading-spinner">Analyzing code...</div>
                ) : review ? (
                    <>
                        <div className="review-section">
                            <h3>Summary</h3>
                            <p>{review.summary}</p>
                        </div>

                        <div className="review-section">
                            <h3>Rating</h3>
                            <p className="rating-badge">{review.rating} / 10</p>
                        </div>

                        {review.bugs && review.bugs.length > 0 && (
                            <div className="review-section bugs">
                                <h3>🐛 Bugs Found</h3>
                                <ul>
                                    {review.bugs.map((bug, index) => (
                                        <li key={index}>{bug}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {review.suggestions && review.suggestions.length > 0 && (
                            <div className="review-section suggestions">
                                <h3>💡 Suggestions</h3>
                                <ul>
                                    {review.suggestions.map((suggestion, index) => (
                                        <li key={index}>{suggestion}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    <p>No review data. Click "AI Review" to analyze.</p>
                )}
            </div>
        </div>
    );
};

export default ReviewPanel;
