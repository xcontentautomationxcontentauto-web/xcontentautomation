#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import threading
import time
import json
import requests
from datetime import datetime, timedelta
import re
from urllib.parse import quote
import os
from dataclasses import dataclass
from typing import List, Dict, Optional
import logging
import hashlib
import webbrowser
from PIL import Image, ImageTk
import sys
import csv
import tweepy
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from bs4 import BeautifulSoup

# Configure enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler('twitter_bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

@dataclass
class NewsArticle:
    title: str
    content: str
    source: str
    url: str
    timestamp: datetime
    country: str
    language: str = "english"
    status: str = "pending"
    category: str = "general"
    source_reliability: int = 5
    content_type: str = "news"  # "news" or "tweet"

@dataclass
class Tweet:
    id: str
    text: str
    username: str
    created_at: datetime
    user_id: str
    retweet_count: int = 0
    like_count: int = 0
    status: str = "pending"
    content_type: str = "tweet"

@dataclass
class TwitterAccount:
    source: str = ""
    target: str = ""
    consumer_key: str = ""
    consumer_secret: str = ""
    access_token: str = ""
    access_token_secret: str = ""
    bearer_token: str = ""

class EnhancedTwitterService:
    def __init__(self):
        self.accounts = TwitterAccount()
        self.is_authenticated = False
        self.last_request_time = 0
        self.rate_limit_delay = 1.0  # seconds between requests
        self.api = None
        self.client = None
        
    def initialize_client(self, accounts):
        """Initialize Twitter client with rate limiting"""
        self.accounts = accounts
        try:
            # Initialize Tweepy Client (Twitter API v2)
            if accounts.bearer_token:
                self.client = tweepy.Client(
                    bearer_token=accounts.bearer_token,
                    consumer_key=accounts.consumer_key,
                    consumer_secret=accounts.consumer_secret,
                    access_token=accounts.access_token,
                    access_token_secret=accounts.access_token_secret,
                    wait_on_rate_limit=True
                )
            
            # Also initialize API v1.1 for some operations
            auth = tweepy.OAuthHandler(accounts.consumer_key, accounts.consumer_secret)
            auth.set_access_token(accounts.access_token, accounts.access_token_secret)
            self.api = tweepy.API(auth, wait_on_rate_limit=True)
            
            self.is_authenticated = True
            logging.info("Twitter client initialized successfully with rate limiting")
            return True
        except Exception as e:
            logging.error(f"Failed to initialize Twitter client: {e}")
            self.is_authenticated = False
            return False
    
    def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def test_connection(self):
        """Test Twitter API connection with rate limiting"""
        if not self.is_authenticated:
            return {"success": False, "error": "Twitter client not initialized"}
        
        self._rate_limit()
        
        try:
            # Test API v2 connection
            if self.client:
                user = self.client.get_me()
                if user.data:
                    return {
                        "success": True,
                        "username": user.data.username,
                        "id": user.data.id,
                        "name": user.data.name
                    }
            
            # Fallback to API v1.1
            if self.api:
                user = self.api.verify_credentials()
                return {
                    "success": True,
                    "username": user.screen_name,
                    "id": user.id_str,
                    "name": user.name
                }
            
            return {"success": False, "error": "No valid API connection"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_user_tweets(self, username, max_tweets=5):
        """Get user tweets with rate limiting"""
        if not self.is_authenticated:
            return {"success": False, "error": "Not authenticated"}
        
        self._rate_limit()
        
        try:
            tweets = []
            
            if self.client:
                # Get user ID first
                user_response = self.client.get_user(username=username)
                if not user_response.data:
                    return {"success": False, "error": f"User {username} not found"}
                
                user_id = user_response.data.id
                
                # Get user's tweets
                tweets_response = self.client.get_users_tweets(
                    id=user_id,
                    max_results=max_tweets,
                    tweet_fields=['created_at', 'public_metrics']
                )
                
                if tweets_response.data:
                    for tweet in tweets_response.data:
                        tweets.append({
                            "id": tweet.id,
                            "text": tweet.text,
                            "created_at": tweet.created_at.isoformat(),
                            "retweet_count": tweet.public_metrics.get('retweet_count', 0),
                            "like_count": tweet.public_metrics.get('like_count', 0)
                        })
            
            return {
                "success": True,
                "tweets": tweets,
                "user": {
                    "username": username,
                    "id": user_id
                }
            }
            
        except Exception as e:
            logging.error(f"Error getting user tweets: {e}")
            return {"success": False, "error": str(e)}
    
    def post_tweet(self, content):
        """Post a tweet with rate limiting"""
        if not self.is_authenticated:
            return {"success": False, "error": "Not authenticated"}
        
        self._rate_limit()
        
        try:
            if self.client:
                response = self.client.create_tweet(text=content)
                if response.data:
                    return {
                        "success": True,
                        "tweet_id": response.data['id'],
                        "content": content
                    }
            elif self.api:
                tweet = self.api.update_status(content)
                return {
                    "success": True,
                    "tweet_id": tweet.id_str,
                    "content": content
                }
            
            return {"success": False, "error": "No valid API connection"}
            
        except Exception as e:
            logging.error(f"Error posting tweet: {e}")
            return {"success": False, "error": str(e)}
    
    def retweet(self, tweet_id):
        """Retweet a tweet"""
        if not self.is_authenticated:
            return {"success": False, "error": "Not authenticated"}
        
        self._rate_limit()
        
        try:
            if self.client:
                response = self.client.retweet(tweet_id=tweet_id)
                if response.data:
                    return {
                        "success": True,
                        "retweet_id": response.data['retweeted'],
                        "original_tweet_id": tweet_id
                    }
            elif self.api:
                retweet = self.api.retweet(tweet_id)
                return {
                    "success": True,
                    "retweet_id": retweet.id_str,
                    "original_tweet_id": tweet_id
                }
            
            return {"success": False, "error": "No valid API connection"}
            
        except Exception as e:
            logging.error(f"Error retweeting: {e}")
            return {"success": False, "error": str(e)}

class NitterScraper:
    def __init__(self, twitter_service):
        self.twitter_service = twitter_service
        self.last_checked_tweets = set()
        self.driver = None
        self.setup_driver()
    
    def setup_driver(self):
        """Setup Selenium WebDriver"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1200,800")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
        except Exception as e:
            logging.error(f"Failed to setup WebDriver: {e}")
            self.driver = None
    
    def scrape_user_tweets(self, username, max_tweets=10):
        """Scrape tweets from a user using Nitter"""
        if not self.driver:
            return []
        
        try:
            url = f"https://nitter.net/{username}"
            self.driver.get(url)
            
            # Wait for tweets to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".timeline-item"))
            )
            
            tweet_elements = self.driver.find_elements(By.CSS_SELECTOR, ".timeline-item")
            tweets = []
            
            for tweet_element in tweet_elements[:max_tweets]:
                try:
                    # Extract tweet content
                    content_element = tweet_element.find_element(By.CSS_SELECTOR, ".tweet-content")
                    content = content_element.text
                    
                    # Extract tweet time
                    time_element = tweet_element.find_element(By.CSS_SELECTOR, ".tweet-date a")
                    time_text = time_element.get_attribute("title")
                    
                    # Extract tweet ID from link
                    tweet_link = time_element.get_attribute("href")
                    tweet_id = tweet_link.split("/")[-1] if tweet_link else f"nitter_{hash(content)}"
                    
                    tweets.append({
                        'id': tweet_id,
                        'text': content,
                        'username': username,
                        'created_at': datetime.now(),
                        'time_text': time_text
                    })
                    
                except Exception as e:
                    logging.debug(f"Error parsing tweet element: {e}")
                    continue
            
            return tweets
            
        except Exception as e:
            logging.error(f"Error scraping tweets from {username}: {e}")
            return []
    
    def get_followed_users_tweets(self, username, max_tweets=20):
        """Get tweets from users followed by the source account"""
        if not self.twitter_service.is_authenticated:
            return []
        
        try:
            # First, get the list of users followed by the source account
            if self.twitter_service.api:
                # Get friends (users followed)
                friends = self.twitter_service.api.get_friends(screen_name=username, count=10)
                followed_users = [friend.screen_name for friend in friends]
            else:
                # Fallback to some default financial/news accounts
                followed_users = [
                    "business", "markets", "financialtimes", "wsj", 
                    "reuters", "bloomberg", "economist", "ft"
                ]
            
            all_tweets = []
            for followed_user in followed_users[:5]:  # Limit to 5 users
                # Try to get tweets via API first
                api_result = self.twitter_service.get_user_tweets(followed_user, max_tweets//5)
                
                if api_result['success']:
                    for tweet_data in api_result['tweets']:
                        tweet = Tweet(
                            id=tweet_data['id'],
                            text=tweet_data['text'],
                            username=followed_user,
                            created_at=datetime.fromisoformat(tweet_data['created_at']),
                            user_id=f"user_{followed_user}",
                            content_type="tweet"
                        )
                        tweet_key = f"{tweet.id}_{tweet.username}"
                        if tweet_key not in self.last_checked_tweets:
                            all_tweets.append(tweet)
                            self.last_checked_tweets.add(tweet_key)
                else:
                    # Fallback to Nitter scraping
                    nitter_tweets = self.scrape_user_tweets(followed_user, max_tweets//5)
                    for tweet_data in nitter_tweets:
                        tweet = Tweet(
                            id=tweet_data['id'],
                            text=tweet_data['text'],
                            username=followed_user,
                            created_at=tweet_data['created_at'],
                            user_id=f"user_{followed_user}",
                            content_type="tweet"
                        )
                        tweet_key = f"{tweet.id}_{tweet.username}"
                        if tweet_key not in self.last_checked_tweets:
                            all_tweets.append(tweet)
                            self.last_checked_tweets.add(tweet_key)
            
            return all_tweets
            
        except Exception as e:
            logging.error(f"Error getting followed users tweets: {e}")
            return []
    
    def close(self):
        """Close the WebDriver"""
        if self.driver:
            self.driver.quit()

class EnhancedNewsScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, application/json',
            'Accept-Language': 'en-US,en;q=0.9'
        })
        self.cors_proxies = [
            "https://api.allorigins.win/get?url=",
            "https://corsproxy.io/?",
            "https://api.codetabs.com/v1/proxy?quest=",
        ]
        
    def get_enhanced_rss_feeds(self):
        """Comprehensive international news sources with reliability scoring"""
        return [
            # High Reliability Sources
            {
                "name": "BBC News", 
                "url": "http://feeds.bbci.co.uk/news/rss.xml",
                "category": "europe", 
                "country": "UK", 
                "language": "english",
                "reliability": 9,
                "priority": 1
            },
            {
                "name": "Reuters World News", 
                "url": "https://www.reutersagency.com/feed/?best-topics=world-news&post_type=best",
                "category": "europe", 
                "country": "UK", 
                "language": "english",
                "reliability": 9,
                "priority": 1
            },
            {
                "name": "Al Jazeera English", 
                "url": "https://www.aljazeera.com/xml/rss/all.xml",
                "category": "middle-east", 
                "country": "Qatar", 
                "language": "english",
                "reliability": 8,
                "priority": 1
            },
            {
                "name": "The Guardian World", 
                "url": "https://www.theguardian.com/world/rss",
                "category": "europe", 
                "country": "UK", 
                "language": "english",
                "reliability": 8,
                "priority": 1
            },

            # Middle East Sources
            {
                "name": "Press TV (Iran)", 
                "url": "https://www.presstv.ir/rss.xml",
                "category": "middle-east", 
                "country": "Iran", 
                "language": "english",
                "reliability": 7,
                "priority": 2
            },
            {
                "name": "Tehran Times", 
                "url": "https://www.tehrantimes.com/rss",
                "category": "middle-east", 
                "country": "Iran", 
                "language": "english",
                "reliability": 7,
                "priority": 2
            },
            {
                "name": "Arab News (Saudi Arabia)", 
                "url": "https://www.arabnews.com/rss.xml",
                "category": "middle-east", 
                "country": "Saudi Arabia", 
                "language": "english",
                "reliability": 7,
                "priority": 2
            },
            {
                "name": "Jerusalem Post", 
                "url": "https://www.jpost.com/Rss/RssFeedsHeadlines",
                "category": "middle-east", 
                "country": "Israel", 
                "language": "english",
                "reliability": 7,
                "priority": 2
            },
            {
                "name": "Daily Sabah (Turkey)", 
                "url": "https://www.dailysabah.com/rss",
                "category": "middle-east", 
                "country": "Turkey", 
                "language": "english",
                "reliability": 7,
                "priority": 2
            },

            # Asian Sources
            {
                "name": "China Daily", 
                "url": "https://www.chinadaily.com.cn/rss/world_rss.xml",
                "category": "asia", 
                "country": "China", 
                "language": "english",
                "reliability": 7,
                "priority": 2
            },
            {
                "name": "The Hindu (India)", 
                "url": "https://www.thehindu.com/news/international/feeder/default.rss",
                "category": "asia", 
                "country": "India", 
                "language": "english",
                "reliability": 8,
                "priority": 2
            },

            # Additional reliable sources
            {
                "name": "CNN World", 
                "url": "http://rss.cnn.com/rss/edition.rss",
                "category": "americas", 
                "country": "USA", 
                "language": "english",
                "reliability": 8,
                "priority": 2
            },
            {
                "name": "NBC News World", 
                "url": "https://feeds.nbcnews.com/nbcnews/public/world",
                "category": "americas", 
                "country": "USA", 
                "language": "english",
                "reliability": 8,
                "priority": 2
            },
            {
                "name": "DW News (Germany)", 
                "url": "https://rss.dw.com/rdf/rss-en-all",
                "category": "europe", 
                "country": "Germany", 
                "language": "english",
                "reliability": 8,
                "priority": 2
            },
        ]
    
    def get_cors_proxy_url(self, url):
        """Get CORS proxy URL with fallbacks"""
        for proxy in self.cors_proxies:
            try:
                test_url = proxy + quote(url)
                response = self.session.head(test_url, timeout=5)
                if response.status_code == 200:
                    return test_url
            except:
                continue
        return self.cors_proxies[0] + quote(url)
    
    def clean_text(self, text):
        """Enhanced text cleaning"""
        if not text:
            return ""
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Replace common HTML entities
        text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
        text = text.replace('&lt;', '<').replace('&gt;', '>')
        text = text.replace('&quot;', '"').replace('&#39;', "'")
        text = text.replace('&#x27;', "'").replace('&#x2F;', '/')
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text[:800]  # Increased limit for better content
    
    def parse_rss_enhanced(self, xml_content, source_info):
        """Enhanced RSS parsing with better error handling"""
        try:
            articles = []
            
            # Try different item patterns
            item_patterns = [
                r'<item>(.*?)</item>',
                r'<entry>(.*?)</entry>'  # Atom feeds
            ]
            
            items = []
            for pattern in item_patterns:
                found = re.findall(pattern, xml_content, re.DOTALL)
                if found:
                    items = found
                    break
            
            for item in items[:15]:  # Increased limit
                try:
                    # Enhanced content extraction
                    title_match = re.search(r'<title>(.*?)</title>', item, re.DOTALL)
                    link_match = re.search(r'<link>(.*?)</link>', item)
                    description_match = re.search(r'<description>(.*?)</description>', item, re.DOTALL)
                    content_match = re.search(r'<content:encoded>(.*?)</content:encoded>', item, re.DOTALL)
                    
                    if title_match:
                        title = self.clean_text(title_match.group(1))
                        link = self.clean_text(link_match.group(1)) if link_match else f"https://{source_info['name'].lower().replace(' ', '')}.com"
                        description = self.clean_text(description_match.group(1) if description_match else "")
                        content = self.clean_text(content_match.group(1) if content_match else description or title)
                        
                        # Skip invalid articles
                        if title and len(title) > 10 and not title.startswith('<?xml'):
                            article = NewsArticle(
                                title=title,
                                content=content,
                                source=source_info['name'],
                                url=link,
                                timestamp=datetime.now(),
                                country=source_info['country'],
                                language=source_info['language'],
                                category=source_info['category'],
                                source_reliability=source_info['reliability'],
                                content_type="news"
                            )
                            articles.append(article)
                            
                except Exception as e:
                    logging.debug(f"Error parsing RSS item: {e}")
                    continue
                    
            return articles
            
        except Exception as e:
            logging.error(f"Error in RSS parsing for {source_info['name']}: {e}")
            return []
    
    def scrape_feed_with_retry(self, feed, max_retries=2):
        """Scrape individual RSS feed with retry logic"""
        for attempt in range(max_retries):
            try:
                logging.info(f"Scraping {feed['name']} (attempt {attempt + 1})...")
                
                proxy_url = self.get_cors_proxy_url(feed['url'])
                
                response = self.session.get(proxy_url, timeout=15)
                response.raise_for_status()
                
                data = response.json()
                if 'contents' in data:
                    articles = self.parse_rss_enhanced(data['contents'], feed)
                    logging.info(f"Found {len(articles)} articles from {feed['name']}")
                    return articles
                else:
                    logging.warning(f"No content received from {feed['name']}")
                    
            except Exception as e:
                logging.warning(f"Attempt {attempt + 1} failed for {feed['name']}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1))  # Exponential backoff
                else:
                    logging.error(f"All attempts failed for {feed['name']}: {e}")
        
        return []
    
    def scrape_all_feeds_enhanced(self, max_feeds=10):
        """Enhanced feed scraping with intelligent source selection"""
        all_feeds = self.get_enhanced_rss_feeds()
        # Sort by priority and reliability
        sorted_feeds = sorted(all_feeds, key=lambda x: (x['priority'], -x['reliability']))
        selected_feeds = sorted_feeds[:max_feeds]
        
        all_articles = []
        results = {
            'successful': 0,
            'failed': 0,
            'total_articles': 0
        }
        
        logging.info(f"Starting enhanced scraping of {len(selected_feeds)} feeds...")
        
        for feed in selected_feeds:
            try:
                articles = self.scrape_feed_with_retry(feed)
                if articles:
                    all_articles.extend(articles)
                    results['successful'] += 1
                    results['total_articles'] += len(articles)
                    logging.info(f"✅ Successfully got {len(articles)} articles from {feed['name']}")
                else:
                    results['failed'] += 1
                    logging.warning(f"⚠️ No articles found from {feed['name']}")
                
                # Dynamic delay based on success
                delay = 2 if articles else 1
                time.sleep(delay)
                
            except Exception as e:
                results['failed'] += 1
                logging.error(f"❌ Failed to fetch {feed['name']}: {e}")
        
        # Enhanced duplicate removal
        unique_articles = self.remove_duplicates(all_articles)
        
        logging.info(f"Scraping completed: {results['successful']} successful, {results['failed']} failed")
        logging.info(f"Total unique articles: {len(unique_articles)}")
        
        # Sort by timestamp and reliability
        unique_articles.sort(key=lambda x: (x.timestamp, x.source_reliability), reverse=True)
        
        return unique_articles
    
    def remove_duplicates(self, articles):
        """Remove duplicate articles based on title and content"""
        seen_titles = set()
        unique_articles = []
        
        for article in articles:
            # Create a unique key based on title and source
            title_key = hashlib.md5(f"{article.title}_{article.source}".encode()).hexdigest()
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_articles.append(article)
        
        return unique_articles

class EnhancedAIAnalyzer:
    def __init__(self):
        self.turkish_keywords = {
            'stocks': ['hisse', 'borsa', 'hisse senedi', 'yatırım'],
            'sales': ['satış', 'ciro', 'gelir', 'kar'],
            'market': ['piyasa', 'borsa', 'finans', 'ekonomi'],
            'news': ['haber', 'gelişme', 'açıklama', 'duyuru'],
            'technology': ['teknoloji', 'yazılım', 'teknolojik', 'dijital'],
            'business': ['iş', 'ticaret', 'şirket', 'firma'],
            'finance': ['finans', 'para', 'ekonomi', 'yatırım'],
            'crypto': ['kripto', 'bitcoin', 'blockchain', 'dijital para']
        }
        
        self.positive_words = [
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive',
            'success', 'profit', 'growth', 'gain', 'rise', 'increase', 'bullish',
            'iyi', 'harika', 'mükemmel', 'olağanüstü', 'pozitif', 'başarı', 'kar', 'büyüme'
        ]
        
        self.negative_words = [
            'bad', 'terrible', 'awful', 'negative', 'loss', 'decline', 'drop', 'fall',
            'bearish', 'crisis', 'problem', 'issue', 'fail', 'decrease',
            'kötü', 'berbat', 'olumsuz', 'zarar', 'düşüş', 'kayıp', 'sorun', 'kriz'
        ]
    
    def analyze_with_turkish_support(self, content, keywords):
        """Enhanced analysis with Turkish language support"""
        if not content or not keywords:
            return self._default_analysis_result("No content or keywords")
        
        content_lower = content.lower()
        relevant_keywords = []
        
        # Check for keyword matches in both languages
        for keyword in keywords:
            if keyword and keyword.lower() in content_lower:
                relevant_keywords.append(keyword)
            
            # Check Turkish equivalents
            if keyword in self.turkish_keywords:
                for turkish_word in self.turkish_keywords[keyword]:
                    if turkish_word in content_lower:
                        relevant_keywords.append(f"{keyword}({turkish_word})")
        
        approved = len(relevant_keywords) > 0
        
        # Enhanced sentiment analysis
        sentiment = self._get_enhanced_sentiment(content)
        confidence = self._calculate_confidence(content, relevant_keywords, sentiment)
        
        return {
            'approved': approved,
            'reason': f"Contains: {', '.join(relevant_keywords)}" if approved else "No relevant keywords found",
            'sentiment': sentiment,
            'confidence': confidence,
            'relevant_keywords': relevant_keywords,
            'language': self._detect_language(content)
        }
    
    def _get_enhanced_sentiment(self, text):
        """Enhanced sentiment analysis with Turkish support"""
        if not text:
            return 'neutral'
        
        text_lower = text.lower()
        positive_count = sum(1 for word in self.positive_words if word in text_lower)
        negative_count = sum(1 for word in self.negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'
    
    def _calculate_confidence(self, content, keywords, sentiment):
        """Calculate confidence score based on multiple factors"""
        if not content:
            return 0.0
        
        base_confidence = 0.0
        
        # Keyword presence boosts confidence
        if keywords:
            base_confidence += 0.4
        
        # Content length factor
        content_length = len(content)
        if content_length > 200:
            base_confidence += 0.2
        elif content_length > 100:
            base_confidence += 0.1
        
        # Sentiment strength factor
        if sentiment != 'neutral':
            base_confidence += 0.1
        
        return min(1.0, base_confidence)
    
    def _detect_language(self, text):
        """Detect language of the content"""
        if not text:
            return 'english'
        
        turkish_chars = re.findall(r'[çğıöşüÇĞİÖŞÜ]', text)
        if len(turkish_chars) > len(text) * 0.05:  # 5% threshold for Turkish
            return 'turkish'
        return 'english'
    
    def _default_analysis_result(self, reason):
        return {
            'approved': False,
            'reason': reason,
            'sentiment': 'neutral',
            'confidence': 0.0,
            'relevant_keywords': [],
            'language': 'english'
        }

class FileBasedDataManager:
    """File-based data management instead of SQLite"""
    
    def __init__(self):
        self.data_dir = "bot_data"
        self.ensure_data_directory()
    
    def ensure_data_directory(self):
        """Create data directory if it doesn't exist"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
    
    def save_setting(self, key, value):
        """Save setting to JSON file"""
        settings_file = os.path.join(self.data_dir, "settings.json")
        settings = self.load_all_settings()
        settings[key] = value
        with open(settings_file, 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=2, default=str)
    
    def get_setting(self, key, default=None):
        """Get setting from JSON file"""
        settings = self.load_all_settings()
        return settings.get(key, default)
    
    def load_all_settings(self):
        """Load all settings from file"""
        settings_file = os.path.join(self.data_dir, "settings.json")
        if os.path.exists(settings_file):
            try:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_content(self, content_data):
        """Save content to CSV file"""
        contents_file = os.path.join(self.data_dir, "contents.csv")
        file_exists = os.path.exists(contents_file)
        
        with open(contents_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                # Write header
                writer.writerow([
                    'id', 'type', 'title', 'content', 'source', 'url', 'username',
                    'country', 'language', 'category', 'source_reliability',
                    'status', 'ai_analysis', 'custom_text', 'posted_content',
                    'tweet_id', 'posted_at', 'approved_at', 'rejected_at',
                    'created_at'
                ])
            
            # Generate unique ID
            content_id = int(time.time())
            
            writer.writerow([
                content_id,
                content_data.get('type', 'unknown'),
                content_data.get('title', ''),
                content_data.get('content', ''),
                content_data.get('source', ''),
                content_data.get('url', ''),
                content_data.get('username', ''),
                content_data.get('country', ''),
                content_data.get('language', ''),
                content_data.get('category', ''),
                content_data.get('source_reliability', 5),
                content_data.get('status', 'pending'),
                json.dumps(content_data.get('ai_analysis', {})),
                content_data.get('custom_text', ''),
                content_data.get('posted_content', ''),
                content_data.get('tweet_id', ''),
                content_data.get('posted_at', ''),
                content_data.get('approved_at', ''),
                content_data.get('rejected_at', ''),
                datetime.now().isoformat()
            ])
        
        return content_id
    
    def get_contents(self, status_filter="all", search_term="", limit=50, offset=0):
        """Get contents from CSV file with filtering"""
        contents_file = os.path.join(self.data_dir, "contents.csv")
        if not os.path.exists(contents_file):
            return []
        
        contents = []
        with open(contents_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Apply filters
                if status_filter != "all" and row['status'] != status_filter:
                    continue
                
                if search_term:
                    search_lower = search_term.lower()
                    if (search_lower not in row['title'].lower() and 
                        search_lower not in row['content'].lower() and 
                        search_lower not in row['source'].lower()):
                        continue
                
                contents.append(row)
        
        # Apply pagination
        return contents[offset:offset + limit]
    
    def get_content_count(self, status_filter="all", search_term=""):
        """Get count of contents matching filters"""
        return len(self.get_contents(status_filter, search_term, limit=10000))
    
    def update_content_status(self, content_id, status):
        """Update content status in CSV file"""
        contents_file = os.path.join(self.data_dir, "contents.csv")
        if not os.path.exists(contents_file):
            return False
        
        # Read all contents
        contents = []
        with open(contents_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['id'] == str(content_id):
                    # Update status and timestamp
                    row['status'] = status
                    timestamp_column = f"{status}_at"
                    row[timestamp_column] = datetime.now().isoformat()
                contents.append(row)
        
        # Write back to file
        with open(contents_file, 'w', newline='', encoding='utf-8') as f:
            if contents:
                writer = csv.DictWriter(f, fieldnames=contents[0].keys())
                writer.writeheader()
                writer.writerows(contents)
        
        return True
    
    def delete_content(self, content_id):
        """Delete content from CSV file"""
        contents_file = os.path.join(self.data_dir, "contents.csv")
        if not os.path.exists(contents_file):
            return False
        
        # Read all contents except the one to delete
        contents = []
        with open(contents_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['id'] != str(content_id):
                    contents.append(row)
        
        # Write back to file
        with open(contents_file, 'w', newline='', encoding='utf-8') as f:
            if contents:
                writer = csv.DictWriter(f, fieldnames=contents[0].keys())
                writer.writeheader()
                writer.writerows(contents)
        
        return True
    
    def save_statistics(self, stats):
        """Save statistics to JSON file"""
        stats_file = os.path.join(self.data_dir, "statistics.json")
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, default=str)
    
    def load_statistics(self):
        """Load statistics from JSON file"""
        stats_file = os.path.join(self.data_dir, "statistics.json")
        if os.path.exists(stats_file):
            try:
                with open(stats_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        
        # Return default statistics
        return {
            'total_scanned': 0,
            'ai_approved': 0,
            'posted': 0,
            'rejected': 0,
            'last_scan': None,
            'last_tweet': None,
            'last_news': None,
            'system_uptime': '0 days, 0 hours',
            'next_scan': None
        }
    
    def log_event(self, level, message, source="system", context=None):
        """Log event to text file"""
        log_file = os.path.join(self.data_dir, "system_logs.txt")
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"{timestamp} [{level.upper()}] {source}: {message}"
        if context:
            log_entry += f" | Context: {json.dumps(context)}"
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry + "\n")
    
    def get_logs(self, level_filter="all", limit=50):
        """Get system logs with filtering"""
        log_file = os.path.join(self.data_dir, "system_logs.txt")
        if not os.path.exists(log_file):
            return []
        
        logs = []
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                if level_filter != "all" and f"[{level_filter.upper()}]" not in line:
                    continue
                logs.append(line.strip())
        
        return logs[-limit:]  # Return most recent logs

class ModernTkinterDashboard:
    def __init__(self, root):
        self.root = root
        self.root.title("🤖 X Bot Manager - AI-Powered Content Automation")
        self.root.geometry("1400x900")
        self.root.configure(bg='#0f1419')
        
        # Make window resizable and set minimum size
        self.root.minsize(1200, 800)
        
        # Initialize enhanced components
        self.db = FileBasedDataManager()
        self.news_scraper = EnhancedNewsScraper()
        self.ai_analyzer = EnhancedAIAnalyzer()
        self.twitter_service = EnhancedTwitterService()
        self.nitter_scraper = NitterScraper(self.twitter_service)
        
        # State variables
        self.accounts = TwitterAccount()
        self.ai_settings = {
            'keywords': ['stocks', 'sales', 'market', 'news', 'technology', 'business', 'finance'],
            'custom_text': '🚀 Check this out:',
            'enable_sentiment': True,
            'require_approval': True,
            'enable_tweet_monitoring': True,
            'tweet_monitoring_interval': 5
        }
        self.news_settings = {
            'sources': [],
            'scan_interval': 10,
            'max_feeds': 10,
            'feed_type': 'rss'
        }
        self.is_scanning = False
        self.scan_thread = None
        self.auto_scan_thread = None
        self.tweet_monitor_thread = None
        self.stop_auto_scan = False
        self.stop_tweet_monitoring = False
        
        # UI state
        self.current_content_page = 1
        self.content_page_size = 10
        self.content_search_term = ""
        self.content_status_filter = "all"
        
        # Performance optimization
        self.content_cache = {}
        self.last_refresh_time = 0
        self.cache_timeout = 5  # seconds
        
        # Load saved settings
        self.load_settings()
        
        # Create modern UI
        self.create_modern_ui()
        
        # Start auto-scan if enabled
        self.start_auto_scan()
        self.start_tweet_monitoring()
        
        # Log startup
        self.db.log_event("info", "Application started successfully")
    
    def create_modern_ui(self):
        """Create modern dark-themed UI with responsive design"""
        # Configure styles
        self.configure_styles()
        
        # Create main container with scrollbar
        self.main_frame = tk.Frame(self.root, bg='#0f1419')
        self.main_frame.pack(fill='both', expand=True)
        
        # Create header
        self.create_header()
        
        # Create notebook for tabs
        self.create_notebook()
    
    def configure_styles(self):
        """Configure modern ttk styles"""
        style = ttk.Style()
        
        # Configure theme colors for dark mode
        style.theme_use('clam')
        
        # Background colors
        style.configure('TFrame', background='#0f1419')
        style.configure('TNotebook', background='#1e2732', borderwidth=0)
        style.configure('TNotebook.Tab', 
                       background='#2d3748', 
                       foreground='#ffffff',
                       padding=[20, 10],
                       font=('Arial', 10, 'bold'))
        style.map('TNotebook.Tab',
                 background=[('selected', '#1da1f2'), ('active', '#1a91da')],
                 foreground=[('selected', '#ffffff')])
        
        # Button styles
        style.configure('Primary.TButton',
                       background='#1da1f2',
                       foreground='#ffffff',
                       borderwidth=0,
                       focuscolor='none',
                       font=('Arial', 10, 'bold'),
                       padding=[15, 10])
        style.map('Primary.TButton',
                 background=[('active', '#1a91da'), ('pressed', '#1a91da')])
        
        style.configure('Secondary.TButton',
                       background='#2d3748',
                       foreground='#ffffff',
                       borderwidth=0,
                       focuscolor='none',
                       font=('Arial', 10),
                       padding=[12, 8])
        
        style.configure('Success.TButton',
                       background='#17bf63',
                       foreground='#ffffff',
                       borderwidth=0,
                       focuscolor='none',
                       font=('Arial', 10, 'bold'),
                       padding=[12, 8])
        
        style.configure('Danger.TButton',
                       background='#e0245e',
                       foreground='#ffffff',
                       borderwidth=0,
                       focuscolor='none',
                       font=('Arial', 10, 'bold'),
                       padding=[12, 8])
        
        # Entry styles
        style.configure('Modern.TEntry',
                       fieldbackground='#2d3748',
                       foreground='#ffffff',
                       borderwidth=1,
                       relief='flat',
                       padding=[10, 5])
        
        # Combobox styles
        style.configure('Modern.TCombobox',
                       fieldbackground='#2d3748',
                       background='#2d3748',
                       foreground='#ffffff',
                       borderwidth=1,
                       relief='flat')
        
        # Scrollbar styles
        style.configure('Modern.Vertical.TScrollbar',
                       background='#2d3748',
                       darkcolor='#2d3748',
                       lightcolor='#2d3748',
                       troughcolor='#1e2732',
                       bordercolor='#1e2732',
                       arrowcolor='#ffffff')
    
    def create_header(self):
        """Create modern header"""
        header_frame = tk.Frame(self.main_frame, bg='#1e2732', height=80)
        header_frame.pack(fill='x', pady=(0, 10))
        header_frame.pack_propagate(False)
        
        # Logo and title
        title_frame = tk.Frame(header_frame, bg='#1e2732')
        title_frame.pack(side='left', padx=20, pady=20)
        
        logo_label = tk.Label(title_frame, text='🤖', font=('Arial', 24), 
                             bg='#1e2732', fg='#1da1f2')
        logo_label.pack(side='left')
        
        title_label = tk.Label(title_frame, text='X Bot Manager', 
                              font=('Arial', 20, 'bold'), 
                              bg='#1e2732', fg='#ffffff')
        title_label.pack(side='left', padx=(10, 0))
        
        subtitle_label = tk.Label(title_frame, text='AI-Powered Content Automation',
                                font=('Arial', 12),
                                bg='#1e2732', fg='#8b98a5')
        subtitle_label.pack(side='left', padx=(10, 0))
        
        # Status indicator
        status_frame = tk.Frame(header_frame, bg='#1e2732')
        status_frame.pack(side='right', padx=20, pady=20)
        
        self.status_indicator = tk.Label(status_frame, text='●', font=('Arial', 16),
                                  bg='#1e2732', fg='#17bf63')
        self.status_indicator.pack(side='left', padx=(0, 10))
        
        self.status_text = tk.Label(status_frame, text='System Active', 
                             font=('Arial', 12, 'bold'),
                             bg='#1e2732', fg='#17bf63')
        self.status_text.pack(side='left')
    
    def create_notebook(self):
        """Create modern notebook with tabs"""
        # Create notebook with modern style
        self.notebook = ttk.Notebook(self.main_frame)
        self.notebook.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Create tabs
        self.create_account_tab()
        self.create_news_tab()
        self.create_contents_tab()
        self.create_ai_tab()
        self.create_stats_tab()
        self.create_logs_tab()
    
    def create_account_tab(self):
        """Create enhanced account settings tab"""
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="🔑 Account Settings")
        
        # Create scrollable frame
        canvas = tk.Canvas(frame, bg='#1e2732', highlightthickness=0)
        scrollbar = ttk.Scrollbar(frame, orient='vertical', command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Title and description
        title_label = tk.Label(scrollable_frame, text="X Account Configuration", 
                              font=('Arial', 18, 'bold'), bg='#1e2732', fg='#ffffff')
        title_label.pack(pady=(20, 10))
        
        desc_label = tk.Label(scrollable_frame, 
                             text="Configure your source and target X accounts. Account A will monitor followed users, Account B will post content.",
                             font=('Arial', 12), bg='#1e2732', fg='#8b98a5', wraplength=800)
        desc_label.pack(pady=(0, 30))
        
        # Account inputs in a modern card
        card_frame = tk.Frame(scrollable_frame, bg='#2d3748', relief='flat', bd=1)
        card_frame.pack(fill='x', padx=20, pady=10)
        
        # Source and Target accounts
        self.create_modern_input_field(card_frame, "Source Account (Account A - Monitor):", "source", 0)
        self.create_modern_input_field(card_frame, "Target Account (Account B - Post):", "target", 1)
        
        # API credentials section
        cred_section = tk.LabelFrame(card_frame, text="🔐 API Credentials", 
                                   font=('Arial', 12, 'bold'),
                                   bg='#2d3748', fg='#ffffff', relief='flat', bd=1)
        cred_section.pack(fill='x', padx=10, pady=20)
        
        self.create_modern_input_field(cred_section, "Consumer Key:", "consumer_key", 0, True)
        self.create_modern_input_field(cred_section, "Consumer Secret:", "consumer_secret", 1, True)
        self.create_modern_input_field(cred_section, "Access Token:", "access_token", 2, True)
        self.create_modern_input_field(cred_section, "Access Token Secret:", "access_token_secret", 3, True)
        self.create_modern_input_field(cred_section, "Bearer Token:", "bearer_token", 4, True)
        
        # Buttons frame
        button_frame = tk.Frame(scrollable_frame, bg='#1e2732')
        button_frame.pack(fill='x', padx=20, pady=30)
        
        # Primary actions
        action_frame = tk.Frame(button_frame, bg='#1e2732')
        action_frame.pack(fill='x', pady=10)
        
        ttk.Button(action_frame, text="💾 Save Settings", 
                  command=self.save_account_settings,
                  style='Primary.TButton').pack(side='left', padx=5)
        
        ttk.Button(action_frame, text="🔍 Verify Both Accounts", 
                  command=self.verify_accounts,
                  style='Success.TButton').pack(side='left', padx=5)
        
        # Secondary actions
        secondary_frame = tk.Frame(button_frame, bg='#1e2732')
        secondary_frame.pack(fill='x', pady=10)
        
        ttk.Button(secondary_frame, text="🎯 Test Source", 
                  command=lambda: self.verify_single_account('source'),
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        ttk.Button(secondary_frame, text="🎯 Test Target", 
                  command=lambda: self.verify_single_account('target'),
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        ttk.Button(secondary_frame, text="🔄 Test Connection", 
                  command=self.test_twitter_connection,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        # Monitor settings
        monitor_frame = tk.Frame(scrollable_frame, bg='#1e2732')
        monitor_frame.pack(fill='x', padx=20, pady=20)
        
        monitor_title = tk.Label(monitor_frame, text="Tweet Monitoring Settings",
                               font=('Arial', 14, 'bold'), bg='#1e2732', fg='#ffffff')
        monitor_title.pack(anchor='w', pady=(0, 10))
        
        monitor_desc = tk.Label(monitor_frame, 
                              text="Account A will automatically monitor tweets from users you follow and share relevant content to Account B",
                              font=('Arial', 11), bg='#1e2732', fg='#8b98a5', wraplength=800)
        monitor_desc.pack(anchor='w', pady=(0, 10))
        
        # Monitor controls
        monitor_controls = tk.Frame(monitor_frame, bg='#1e2732')
        monitor_controls.pack(fill='x', pady=10)
        
        ttk.Button(monitor_controls, text="🔄 Start Tweet Monitoring", 
                  command=self.start_tweet_monitoring,
                  style='Success.TButton').pack(side='left', padx=5)
        
        ttk.Button(monitor_controls, text="⏹️ Stop Tweet Monitoring", 
                  command=self.stop_tweet_monitoring_manual,
                  style='Danger.TButton').pack(side='left', padx=5)
        
        ttk.Button(monitor_controls, text="🎯 Test Tweet Monitoring", 
                  command=self.test_tweet_monitoring,
                  style='Secondary.TButton').pack(side='left', padx=5)
    
    def create_modern_input_field(self, parent, label, field, row, is_password=False):
        """Create modern input field with label"""
        frame = tk.Frame(parent, bg='#2d3748')
        frame.pack(fill='x', padx=20, pady=10)
        
        # Label
        label_widget = tk.Label(frame, text=label, bg='#2d3748', fg='#ffffff',
                               font=('Arial', 10, 'bold'))
        label_widget.pack(anchor='w', pady=(0, 5))
        
        # Entry field
        var = tk.StringVar(value=getattr(self.accounts, field, ""))
        setattr(self, f"{field}_var", var)
        
        entry = ttk.Entry(frame, textvariable=var, show='•' if is_password else None,
                         style='Modern.TEntry', font=('Arial', 10))
        entry.pack(fill='x', pady=(0, 5))
        
        # Bind change event
        var.trace('w', lambda *args: self.on_account_change(field))
    
    def create_news_tab(self):
        """Create enhanced news sources tab"""
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="📰 News Sources")
        
        # Create scrollable frame
        canvas = tk.Canvas(frame, bg='#1e2732', highlightthickness=0)
        scrollbar = ttk.Scrollbar(frame, orient='vertical', command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Title and description
        title_label = tk.Label(scrollable_frame, text="Global News Sources & Auto-Scan", 
                              font=('Arial', 18, 'bold'), bg='#1e2732', fg='#ffffff')
        title_label.pack(pady=(20, 10))
        
        desc_label = tk.Label(scrollable_frame, 
                            text="Configure international news sources and automatic scanning frequency. Approved news will be posted to Account B.",
                            font=('Arial', 12), bg='#1e2732', fg='#8b98a5', wraplength=800)
        desc_label.pack(pady=(0, 20))
        
        # Controls frame
        controls_frame = tk.Frame(scrollable_frame, bg='#1e2732')
        controls_frame.pack(fill='x', padx=20, pady=10)
        
        # Scan interval
        interval_frame = tk.Frame(controls_frame, bg='#1e2732')
        interval_frame.pack(fill='x', pady=10)
        
        tk.Label(interval_frame, text="Auto-Scan Frequency:", 
                bg='#1e2732', fg='#ffffff', font=('Arial', 10, 'bold')).pack(side='left')
        
        self.scan_interval_var = tk.StringVar(value=str(self.news_settings['scan_interval']))
        interval_combo = ttk.Combobox(interval_frame, textvariable=self.scan_interval_var,
                                     values=['5', '10', '15', '30', '60'], state='readonly',
                                     style='Modern.TCombobox', width=10)
        interval_combo.pack(side='left', padx=10)
        
        tk.Label(interval_frame, text="minutes", 
                bg='#1e2732', fg='#8b98a5').pack(side='left')
        
        # Max feeds
        feeds_frame = tk.Frame(controls_frame, bg='#1e2732')
        feeds_frame.pack(fill='x', pady=10)
        
        tk.Label(feeds_frame, text="Maximum Feeds to Scan:", 
                bg='#1e2732', fg='#ffffff', font=('Arial', 10, 'bold')).pack(side='left')
        
        self.max_feeds_var = tk.StringVar(value=str(self.news_settings['max_feeds']))
        feeds_combo = ttk.Combobox(feeds_frame, textvariable=self.max_feeds_var,
                                  values=['5', '10', '15', '20'], state='readonly',
                                  style='Modern.TCombobox', width=10)
        feeds_combo.pack(side='left', padx=10)
        
        # News sources list in a card
        card_frame = tk.Frame(scrollable_frame, bg='#2d3748', relief='flat', bd=1)
        card_frame.pack(fill='both', expand=True, padx=20, pady=10)
        
        # Sources header
        sources_header = tk.Frame(card_frame, bg='#2d3748')
        sources_header.pack(fill='x', padx=20, pady=15)
        
        tk.Label(sources_header, text="Select News Sources:", 
                bg='#2d3748', fg='#ffffff', font=('Arial', 12, 'bold')).pack(side='left')
        
        # Bulk actions
        bulk_frame = tk.Frame(card_frame, bg='#2d3748')
        bulk_frame.pack(fill='x', padx=20, pady=10)
        
        ttk.Button(bulk_frame, text="✅ Select All", 
                  command=self.select_all_sources,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        ttk.Button(bulk_frame, text="❌ Deselect All", 
                  command=self.deselect_all_sources,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        ttk.Button(bulk_frame, text="🧪 Test All Selected", 
                  command=self.test_all_sources,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        # Sources list with scrollbar
        list_frame = tk.Frame(card_frame, bg='#2d3748')
        list_frame.pack(fill='both', expand=True, padx=20, pady=10)
        
        # Create treeview for sources
        columns = ('selected', 'name', 'country', 'category', 'reliability')
        self.sources_tree = ttk.Treeview(list_frame, columns=columns, show='headings', height=12)
        
        # Configure columns
        self.sources_tree.heading('selected', text='✓')
        self.sources_tree.heading('name', text='Source Name')
        self.sources_tree.heading('country', text='Country')
        self.sources_tree.heading('category', text='Category')
        self.sources_tree.heading('reliability', text='Reliability')
        
        self.sources_tree.column('selected', width=50, anchor='center')
        self.sources_tree.column('name', width=200)
        self.sources_tree.column('country', width=100)
        self.sources_tree.column('category', width=100)
        self.sources_tree.column('reliability', width=80, anchor='center')
        
        # Add scrollbar
        scrollbar = ttk.Scrollbar(list_frame, orient='vertical', command=self.sources_tree.yview)
        self.sources_tree.configure(yscrollcommand=scrollbar.set)
        
        self.sources_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind click event for selection
        self.sources_tree.bind('<Button-1>', self.on_source_click)
        
        # Populate sources
        self.populate_sources_tree()
        
        # Action buttons
        action_frame = tk.Frame(scrollable_frame, bg='#1e2732')
        action_frame.pack(fill='x', padx=20, pady=20)
        
        ttk.Button(action_frame, text="💾 Save Settings", 
                  command=self.save_news_settings,
                  style='Primary.TButton').pack(side='left', padx=5)
        
        ttk.Button(action_frame, text="🔄 Scan Now", 
                  command=self.start_manual_scan,
                  style='Success.TButton').pack(side='left', padx=5)
        
        ttk.Button(action_frame, text="⏹️ Stop Auto-Scan", 
                  command=self.stop_auto_scan_manual,
                  style='Danger.TButton').pack(side='left', padx=5)
    
    def create_contents_tab(self):
        """Create enhanced found contents tab with clickable actions"""
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="📄 Found Contents")
        
        # Title and stats
        header_frame = tk.Frame(frame, bg='#1e2732')
        header_frame.pack(fill='x', padx=20, pady=20)
        
        title_label = tk.Label(header_frame, text="Found Contents", 
                              font=('Arial', 18, 'bold'), bg='#1e2732', fg='#ffffff')
        title_label.pack(side='left')
        
        # Stats badge
        self.content_count_label = tk.Label(header_frame, text="0 Items", 
                                           font=('Arial', 12, 'bold'),
                                           bg='#17bf63', fg='#ffffff',
                                           padx=15, pady=5)
        self.content_count_label.pack(side='right')
        
        # Controls frame
        controls_frame = tk.Frame(frame, bg='#1e2732')
        controls_frame.pack(fill='x', padx=20, pady=10)
        
        # Search and filter
        search_frame = tk.Frame(controls_frame, bg='#1e2732')
        search_frame.pack(fill='x', pady=10)
        
        tk.Label(search_frame, text="Search:", bg='#1e2732', fg='#ffffff').pack(side='left')
        
        self.content_search_var = tk.StringVar()
        search_entry = ttk.Entry(search_frame, textvariable=self.content_search_var,
                               style='Modern.TEntry', width=30)
        search_entry.pack(side='left', padx=10)
        search_entry.bind('<KeyRelease>', self.on_content_search)
        
        tk.Label(search_frame, text="Filter:", bg='#1e2732', fg='#ffffff').pack(side='left', padx=(20, 0))
        
        self.content_filter_var = tk.StringVar(value="all")
        filter_combo = ttk.Combobox(search_frame, textvariable=self.content_filter_var,
                                   values=["all", "pending", "approved", "posted", "rejected"],
                                   state='readonly', style='Modern.TCombobox', width=15)
        filter_combo.pack(side='left', padx=10)
        filter_combo.bind('<<ComboboxSelected>>', self.on_content_filter)
        
        # Bulk actions
        bulk_frame = tk.Frame(controls_frame, bg='#1e2732')
        bulk_frame.pack(fill='x', pady=10)
        
        ttk.Button(bulk_frame, text="✅ Approve All Visible", 
                  command=self.bulk_approve_contents,
                  style='Success.TButton').pack(side='left', padx=5)
        
        ttk.Button(bulk_frame, text="🔄 Refresh", 
                  command=self.refresh_contents,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        # Contents display frame with scrollbar
        content_frame = tk.Frame(frame, bg='#1e2732')
        content_frame.pack(fill='both', expand=True, padx=20, pady=10)
        
        # Create canvas and scrollbar for contents
        content_canvas = tk.Canvas(content_frame, bg='#2d3748', highlightthickness=0)
        content_scrollbar = ttk.Scrollbar(content_frame, orient='vertical', command=content_canvas.yview)
        content_scrollable_frame = tk.Frame(content_canvas, bg='#2d3748')
        
        content_scrollable_frame.bind(
            "<Configure>",
            lambda e: content_canvas.configure(scrollregion=content_canvas.bbox("all"))
        )
        
        content_canvas.create_window((0, 0), window=content_scrollable_frame, anchor="nw")
        content_canvas.configure(yscrollcommand=content_scrollbar.set)
        
        content_canvas.pack(side="left", fill="both", expand=True)
        content_scrollbar.pack(side="right", fill="y")
        
        # Store the scrollable frame for content display
        self.content_display_frame = content_scrollable_frame
        
        # Pagination
        pagination_frame = tk.Frame(frame, bg='#1e2732')
        pagination_frame.pack(fill='x', padx=20, pady=10)
        
        self.prev_btn = ttk.Button(pagination_frame, text="◀ Previous",
                                  command=self.prev_content_page,
                                  style='Secondary.TButton')
        self.prev_btn.pack(side='left', padx=5)
        
        self.page_label = tk.Label(pagination_frame, text="Page 1 of 1", 
                                  bg='#1e2732', fg='#ffffff')
        self.page_label.pack(side='left', padx=20)
        
        self.next_btn = ttk.Button(pagination_frame, text="Next ▶",
                                  command=self.next_content_page,
                                  style='Secondary.TButton')
        self.next_btn.pack(side='left', padx=5)
        
        # Initial load
        self.refresh_contents()
    
    def create_ai_tab(self):
        """Create enhanced AI settings tab"""
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="🤖 AI Settings")
        
        # Create scrollable frame
        canvas = tk.Canvas(frame, bg='#1e2732', highlightthickness=0)
        scrollbar = ttk.Scrollbar(frame, orient='vertical', command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Title and description
        title_label = tk.Label(scrollable_frame, text="AI Content Analysis", 
                              font=('Arial', 18, 'bold'), bg='#1e2732', fg='#ffffff')
        title_label.pack(pady=(20, 10))
        
        desc_label = tk.Label(scrollable_frame, 
                            text="Configure AI analysis for content filtering and enhancement",
                            font=('Arial', 12), bg='#1e2732', fg='#8b98a5', wraplength=800)
        desc_label.pack(pady=(0, 20))
        
        # AI settings card
        card_frame = tk.Frame(scrollable_frame, bg='#2d3748', relief='flat', bd=1)
        card_frame.pack(fill='both', expand=True, padx=20, pady=10)
        
        # Keywords section
        keywords_frame = tk.Frame(card_frame, bg='#2d3748')
        keywords_frame.pack(fill='x', padx=20, pady=20)
        
        tk.Label(keywords_frame, text="Keywords for Analysis:", 
                bg='#2d3748', fg='#ffffff', font=('Arial', 12, 'bold')).pack(anchor='w')
        
        # Quick add buttons
        quick_add_frame = tk.Frame(keywords_frame, bg='#2d3748')
        quick_add_frame.pack(fill='x', pady=10)
        
        ttk.Button(quick_add_frame, text="🇺🇸 Add English Keywords",
                  command=self.add_english_keywords,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        ttk.Button(quick_add_frame, text="🇹🇷 Add Turkish Keywords",
                  command=self.add_turkish_keywords,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        # Keywords input
        input_frame = tk.Frame(keywords_frame, bg='#2d3748')
        input_frame.pack(fill='x', pady=10)
        
        self.new_keyword_var = tk.StringVar()
        keyword_entry = ttk.Entry(input_frame, textvariable=self.new_keyword_var,
                                style='Modern.TEntry')
        keyword_entry.pack(side='left', fill='x', expand=True, padx=(0, 10))
        keyword_entry.bind('<Return>', lambda e: self.add_keyword())
        
        ttk.Button(input_frame, text="Add", 
                  command=self.add_keyword,
                  style='Secondary.TButton').pack(side='left')
        
        # Keywords list
        list_frame = tk.Frame(keywords_frame, bg='#2d3748')
        list_frame.pack(fill='x', pady=10)
        
        self.keywords_listbox = tk.Listbox(list_frame, bg='#2d3748', fg='#ffffff',
                                          selectbackground='#1da1f2', 
                                          font=('Arial', 10),
                                          height=8)
        self.keywords_listbox.pack(fill='x')
        
        # Keywords actions
        keyword_actions = tk.Frame(keywords_frame, bg='#2d3748')
        keyword_actions.pack(fill='x', pady=10)
        
        ttk.Button(keyword_actions, text="Remove Selected", 
                  command=self.remove_keyword,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        ttk.Button(keyword_actions, text="Clear All", 
                  command=self.clear_keywords,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        # Custom text
        custom_frame = tk.Frame(card_frame, bg='#2d3748')
        custom_frame.pack(fill='x', padx=20, pady=20)
        
        tk.Label(custom_frame, text="Custom Text (added to shared tweets):", 
                bg='#2d3748', fg='#ffffff', font=('Arial', 12, 'bold')).pack(anchor='w')
        
        self.custom_text_var = tk.StringVar(value=self.ai_settings['custom_text'])
        custom_entry = ttk.Entry(custom_frame, textvariable=self.custom_text_var,
                               style='Modern.TEntry')
        custom_entry.pack(fill='x', pady=10)
        
        # Toggle settings
        toggles_frame = tk.Frame(card_frame, bg='#2d3748')
        toggles_frame.pack(fill='x', padx=20, pady=20)
        
        self.enable_sentiment_var = tk.BooleanVar(value=self.ai_settings['enable_sentiment'])
        sentiment_check = tk.Checkbutton(toggles_frame, 
                                       text="Enable Sentiment Analysis",
                                       variable=self.enable_sentiment_var,
                                       bg='#2d3748', fg='#ffffff',
                                       selectcolor='#2d3748',
                                       font=('Arial', 10))
        sentiment_check.pack(anchor='w', pady=5)
        
        self.require_approval_var = tk.BooleanVar(value=self.ai_settings['require_approval'])
        approval_check = tk.Checkbutton(toggles_frame, 
                                      text="Require Manual Approval Before Sharing",
                                      variable=self.require_approval_var,
                                      bg='#2d3748', fg='#ffffff',
                                      selectcolor='#2d3748',
                                      font=('Arial', 10))
        approval_check.pack(anchor='w', pady=5)
        
        self.enable_tweet_monitoring_var = tk.BooleanVar(value=self.ai_settings['enable_tweet_monitoring'])
        tweet_monitor_check = tk.Checkbutton(toggles_frame, 
                                           text="Enable Tweet Monitoring (Account A follows)",
                                           variable=self.enable_tweet_monitoring_var,
                                           bg='#2d3748', fg='#ffffff',
                                           selectcolor='#2d3748',
                                           font=('Arial', 10))
        tweet_monitor_check.pack(anchor='w', pady=5)
        
        # Tweet monitoring interval
        monitor_interval_frame = tk.Frame(toggles_frame, bg='#2d3748')
        monitor_interval_frame.pack(fill='x', pady=5)
        
        tk.Label(monitor_interval_frame, text="Tweet Check Interval:", 
                bg='#2d3748', fg='#ffffff').pack(side='left')
        
        self.tweet_interval_var = tk.StringVar(value=str(self.ai_settings['tweet_monitoring_interval']))
        interval_combo = ttk.Combobox(monitor_interval_frame, textvariable=self.tweet_interval_var,
                                     values=['2', '5', '10', '15', '30'], state='readonly',
                                     style='Modern.TCombobox', width=8)
        interval_combo.pack(side='left', padx=10)
        
        tk.Label(monitor_interval_frame, text="minutes", 
                bg='#2d3748', fg='#8b98a5').pack(side='left')
        
        # Save button
        save_frame = tk.Frame(scrollable_frame, bg='#1e2732')
        save_frame.pack(fill='x', padx=20, pady=20)
        
        ttk.Button(save_frame, text="💾 Save AI Settings", 
                  command=self.save_ai_settings,
                  style='Primary.TButton').pack()
        
        # Populate keywords
        for keyword in self.ai_settings['keywords']:
            self.keywords_listbox.insert(tk.END, keyword)
    
    def create_stats_tab(self):
        """Create enhanced statistics tab"""
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="📊 Statistics")
        
        # Title
        title_label = tk.Label(frame, text="Statistics & Analytics", 
                              font=('Arial', 18, 'bold'), bg='#1e2732', fg='#ffffff')
        title_label.pack(pady=(20, 20))
        
        # Stats cards
        stats_frame = tk.Frame(frame, bg='#1e2732')
        stats_frame.pack(fill='x', padx=20, pady=10)
        
        # Create stat cards
        self.stat_cards = {}
        stats_data = [
            ("Total Scanned", "total_scanned", "#1da1f2"),
            ("AI Approved", "ai_approved", "#17bf63"),
            ("Posted", "posted", "#794bc4"),
            ("Rejected", "rejected", "#e0245e")
        ]
        
        for i, (label, key, color) in enumerate(stats_data):
            card = tk.Frame(stats_frame, bg='#2d3748', relief='flat', bd=1)
            card.grid(row=i//2, column=i%2, padx=10, pady=10, sticky='nsew')
            
            # Configure grid weights for responsive layout
            stats_frame.grid_rowconfigure(i//2, weight=1)
            stats_frame.grid_columnconfigure(i%2, weight=1)
            
            # Stat value
            value_label = tk.Label(card, text="0", font=('Arial', 24, 'bold'),
                                 bg='#2d3748', fg=color)
            value_label.pack(pady=(20, 5))
            
            # Stat label
            label_label = tk.Label(card, text=label, font=('Arial', 12),
                                 bg='#2d3748', fg='#8b98a5')
            label_label.pack(pady=(0, 20))
            
            self.stat_cards[key] = value_label
        
        # Performance metrics
        perf_frame = tk.Frame(frame, bg='#1e2732')
        perf_frame.pack(fill='x', padx=20, pady=20)
        
        tk.Label(perf_frame, text="Performance Metrics:", 
                font=('Arial', 14, 'bold'), bg='#1e2732', fg='#ffffff').pack(anchor='w')
        
        # Performance stats
        perf_stats_frame = tk.Frame(perf_frame, bg='#1e2732')
        perf_stats_frame.pack(fill='x', pady=10)
        
        self.perf_labels = {}
        perf_data = [
            ("Efficiency", "efficiency"),
            ("AI Approval Rate", "approval_rate"),
            ("Success Rate", "success_rate")
        ]
        
        for label, key in perf_data:
            frame = tk.Frame(perf_stats_frame, bg='#1e2732')
            frame.pack(fill='x', pady=5)
            
            tk.Label(frame, text=f"{label}:", bg='#1e2732', fg='#ffffff').pack(side='left')
            
            self.perf_labels[key] = tk.Label(frame, text="0%", bg='#1e2732', fg='#17bf63',
                                           font=('Arial', 10, 'bold'))
            self.perf_labels[key].pack(side='right')
        
        # System information
        sys_frame = tk.Frame(frame, bg='#1e2732')
        sys_frame.pack(fill='x', padx=20, pady=20)
        
        tk.Label(sys_frame, text="System Information:", 
                font=('Arial', 14, 'bold'), bg='#1e2732', fg='#ffffff').pack(anchor='w')
        
        # System stats
        sys_stats_frame = tk.Frame(sys_frame, bg='#1e2732')
        sys_stats_frame.pack(fill='x', pady=10)
        
        self.sys_labels = {}
        sys_data = [
            ("Last Scan", "last_scan"),
            ("Last Tweet", "last_tweet"),
            ("System Uptime", "system_uptime"),
            ("Next Scan", "next_scan")
        ]
        
        for label, key in sys_data:
            frame = tk.Frame(sys_stats_frame, bg='#1e2732')
            frame.pack(fill='x', pady=3)
            
            tk.Label(frame, text=f"{label}:", bg='#1e2732', fg='#8b98a5').pack(side='left')
            
            self.sys_labels[key] = tk.Label(frame, text="Never", bg='#1e2732', fg='#ffffff')
            self.sys_labels[key].pack(side='right')
        
        # Action buttons
        action_frame = tk.Frame(frame, bg='#1e2732')
        action_frame.pack(fill='x', padx=20, pady=20)
        
        ttk.Button(action_frame, text="🔄 Refresh Stats", 
                  command=self.refresh_stats,
                  style='Primary.TButton').pack(side='left', padx=5)
        
        ttk.Button(action_frame, text="📈 Generate Report", 
                  command=self.generate_report,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        ttk.Button(action_frame, text="🔄 Reset Statistics", 
                  command=self.reset_statistics,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        # Initial refresh
        self.refresh_stats()
    
    def create_logs_tab(self):
        """Create system logs tab"""
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="📋 System Logs")
        
        # Title and controls
        header_frame = tk.Frame(frame, bg='#1e2732')
        header_frame.pack(fill='x', padx=20, pady=20)
        
        title_label = tk.Label(header_frame, text="System Logs & Activity", 
                              font=('Arial', 18, 'bold'), bg='#1e2732', fg='#ffffff')
        title_label.pack(side='left')
        
        # Controls
        controls_frame = tk.Frame(header_frame, bg='#1e2732')
        controls_frame.pack(side='right')
        
        # Log level filter
        tk.Label(controls_frame, text="Filter:", bg='#1e2732', fg='#ffffff').pack(side='left')
        
        self.log_filter_var = tk.StringVar(value="all")
        log_filter = ttk.Combobox(controls_frame, textvariable=self.log_filter_var,
                                 values=["all", "info", "success", "warning", "error"],
                                 state='readonly', style='Modern.TCombobox', width=10)
        log_filter.pack(side='left', padx=10)
        log_filter.bind('<<ComboboxSelected>>', self.refresh_logs)
        
        # Logs display
        logs_frame = tk.Frame(frame, bg='#1e2732')
        logs_frame.pack(fill='both', expand=True, padx=20, pady=10)
        
        # Create text widget for logs
        self.logs_text = scrolledtext.ScrolledText(logs_frame, 
                                                  bg='#2d3748', fg='#ffffff',
                                                  font=('Consolas', 9), 
                                                  wrap=tk.WORD,
                                                  padx=15, pady=15)
        self.logs_text.pack(fill='both', expand=True)
        
        # Configure tags for log levels
        self.logs_text.tag_configure('INFO', foreground='#1da1f2')
        self.logs_text.tag_configure('SUCCESS', foreground='#17bf63')
        self.logs_text.tag_configure('WARNING', foreground='#ffad1f')
        self.logs_text.tag_configure('ERROR', foreground='#e0245e')
        
        # Action buttons
        action_frame = tk.Frame(frame, bg='#1e2732')
        action_frame.pack(fill='x', padx=20, pady=20)
        
        ttk.Button(action_frame, text="🔄 Refresh Logs", 
                  command=self.refresh_logs,
                  style='Primary.TButton').pack(side='left', padx=5)
        
        ttk.Button(action_frame, text="📥 Export Logs", 
                  command=self.export_logs,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        ttk.Button(action_frame, text="🗑️ Clear Logs", 
                  command=self.clear_logs,
                  style='Secondary.TButton').pack(side='left', padx=5)
        
        # Initial load
        self.refresh_logs()
    
    # Enhanced functionality methods
    def populate_sources_tree(self):
        """Populate sources treeview with news sources"""
        # Clear existing items
        for item in self.sources_tree.get_children():
            self.sources_tree.delete(item)
        
        # Add sources
        feeds = self.news_scraper.get_enhanced_rss_feeds()
        for feed in feeds:
            is_selected = feed['name'] in self.news_settings['sources']
            self.sources_tree.insert('', 'end', values=(
                '✓' if is_selected else '',
                feed['name'],
                feed['country'],
                feed['category'],
                f"{feed['reliability']}/10"
            ))
    
    def on_source_click(self, event):
        """Handle source selection in treeview"""
        item = self.sources_tree.identify_row(event.y)
        if item:
            col = self.sources_tree.identify_column(event.x)
            if col == '#1':  # Selected column
                values = self.sources_tree.item(item)['values']
                feed_name = values[1]
                
                if values[0] == '✓':
                    # Deselect
                    self.sources_tree.set(item, 'selected', '')
                    if feed_name in self.news_settings['sources']:
                        self.news_settings['sources'].remove(feed_name)
                else:
                    # Select
                    self.sources_tree.set(item, 'selected', '✓')
                    if feed_name not in self.news_settings['sources']:
                        self.news_settings['sources'].append(feed_name)
    
    def on_content_search(self, event=None):
        """Handle content search"""
        self.content_search_term = self.content_search_var.get()
        self.current_content_page = 1
        self.refresh_contents()
    
    def on_content_filter(self, event=None):
        """Handle content filter change"""
        self.content_status_filter = self.content_filter_var.get()
        self.current_content_page = 1
        self.refresh_contents()
    
    def refresh_contents(self):
        """Refresh contents display with pagination and clickable actions - OPTIMIZED"""
        try:
            # Check cache first
            current_time = time.time()
            cache_key = f"{self.content_status_filter}_{self.content_search_term}_{self.current_content_page}"
            
            if (cache_key in self.content_cache and 
                current_time - self.last_refresh_time < self.cache_timeout):
                # Use cached content
                cached_data = self.content_cache[cache_key]
                contents = cached_data['contents']
                total_count = cached_data['total_count']
            else:
                # Calculate pagination
                total_count = self.db.get_content_count(
                    self.content_status_filter, 
                    self.content_search_term
                )
                offset = (self.current_content_page - 1) * self.content_page_size
                
                # Get contents
                contents = self.db.get_contents(
                    self.content_status_filter,
                    self.content_search_term,
                    self.content_page_size,
                    offset
                )
                
                # Cache the results
                self.content_cache[cache_key] = {
                    'contents': contents,
                    'total_count': total_count
                }
                self.last_refresh_time = current_time
            
            # Clear existing content
            for widget in self.content_display_frame.winfo_children():
                widget.destroy()
            
            if not contents:
                no_content_label = tk.Label(self.content_display_frame, 
                                          text="No contents found matching the current filter.",
                                          bg='#2d3748', fg='#8b98a5', font=('Arial', 12))
                no_content_label.pack(pady=20)
                return
            
            # Display contents using threading for better performance
            self.display_contents_threaded(contents, total_count)
            
        except Exception as e:
            logging.error(f"Error refreshing contents: {e}")
            self.db.log_event("error", f"Error refreshing contents: {e}")
    
    def display_contents_threaded(self, contents, total_count):
        """Display contents in a separate thread for better performance"""
        def display_contents():
            try:
                for content in contents:
                    if self.stop_display:
                        return
                    
                    content_card = self.create_content_card(content)
                    content_card.pack(fill='x', padx=10, pady=10)
                    
                    # Add separator
                    separator = tk.Frame(self.content_display_frame, bg='#1e2732', height=1)
                    separator.pack(fill='x', padx=20, pady=5)
                
                # Update pagination on main thread
                self.root.after(0, self.update_pagination, total_count)
                
            except Exception as e:
                logging.error(f"Error displaying contents: {e}")
        
        # Start display in separate thread
        self.stop_display = False
        display_thread = threading.Thread(target=display_contents, daemon=True)
        display_thread.start()
    
    def create_content_card(self, content):
        """Create a content card widget - OPTIMIZED"""
        content_card = tk.Frame(self.content_display_frame, bg='#2d3748', relief='flat', bd=1)
        
        content_id = content['id']
        content_type = content['type']
        title = content['title']
        content_text = content['content']
        source = content['source']
        username = content['username']
        created_at = content['created_at']
        status = content['status']
        ai_analysis = json.loads(content['ai_analysis']) if content['ai_analysis'] else {}
        
        # Content header
        header_frame = tk.Frame(content_card, bg='#2d3748')
        header_frame.pack(fill='x', padx=15, pady=10)
        
        # Type badge
        type_color = '#1da1f2' if content_type == 'tweet' else '#17bf63'
        type_badge = tk.Label(header_frame, text=f"[{content_type.upper()}]", 
                             bg=type_color, fg='#ffffff', font=('Arial', 10, 'bold'),
                             padx=8, pady=2)
        type_badge.pack(side='left')
        
        # Title
        title_label = tk.Label(header_frame, text=title, 
                              bg='#2d3748', fg='#ffffff', font=('Arial', 12, 'bold'),
                              wraplength=800, justify='left')
        title_label.pack(side='left', padx=10, fill='x', expand=True)
        
        # Source and date
        info_frame = tk.Frame(content_card, bg='#2d3748')
        info_frame.pack(fill='x', padx=15, pady=5)
        
        source_text = f"Source: {source}" if source else f"User: @{username}" if username else "Unknown Source"
        source_label = tk.Label(info_frame, text=source_text,
                               bg='#2d3748', fg='#17bf63', font=('Arial', 10))
        source_label.pack(side='left')
        
        date_label = tk.Label(info_frame, text=f"Added: {created_at}",
                             bg='#2d3748', fg='#8b98a5', font=('Arial', 10))
        date_label.pack(side='right')
        
        # Status
        status_frame = tk.Frame(content_card, bg='#2d3748')
        status_frame.pack(fill='x', padx=15, pady=5)
        
        status_color = {
            'pending': '#ffad1f',
            'approved': '#17bf63', 
            'posted': '#1da1f2',
            'rejected': '#e0245e'
        }.get(status, '#8b98a5')
        
        status_label = tk.Label(status_frame, text=f"Status: {status.upper()}",
                               bg='#2d3748', fg=status_color, font=('Arial', 10, 'bold'))
        status_label.pack(side='left')
        
        # AI Analysis
        if ai_analysis:
            ai_frame = tk.Frame(content_card, bg='#2d3748')
            ai_frame.pack(fill='x', padx=15, pady=5)
            
            sentiment = ai_analysis.get('sentiment', 'neutral')
            confidence = ai_analysis.get('confidence', 0) * 100
            keywords = ai_analysis.get('relevant_keywords', [])
            
            ai_text = f"AI: {sentiment} • {confidence:.0f}% confidence"
            if keywords:
                ai_text += f" • Keywords: {', '.join(keywords)}"
            
            ai_label = tk.Label(ai_frame, text=ai_text,
                               bg='#2d3748', fg='#8b98a5', font=('Arial', 10))
            ai_label.pack(side='left')
        
        # Content preview
        content_frame = tk.Frame(content_card, bg='#2d3748')
        content_frame.pack(fill='x', padx=15, pady=10)
        
        preview = content_text[:300] + "..." if len(content_text) > 300 else content_text
        content_label = tk.Label(content_frame, text=preview,
                                bg='#2d3748', fg='#ffffff', font=('Arial', 10),
                                wraplength=800, justify='left')
        content_label.pack(fill='x')
        
        # Actions - OPTIMIZED with direct function calls
        actions_frame = tk.Frame(content_card, bg='#2d3748')
        actions_frame.pack(fill='x', padx=15, pady=10)
        
        actions_label = tk.Label(actions_frame, text="Actions: ",
                                bg='#2d3748', fg='#8b98a5', font=('Arial', 10))
        actions_label.pack(side='left')
        
        # Action buttons based on status - OPTIMIZED
        if status == 'pending':
            approve_btn = tk.Label(actions_frame, text="[Approve]", 
                                 bg='#2d3748', fg='#17bf63', font=('Arial', 10, 'bold'),
                                 cursor='hand2')
            approve_btn.pack(side='left', padx=5)
            approve_btn.bind('<Button-1>', lambda e, cid=content_id: self.approve_content(cid))
            
            reject_btn = tk.Label(actions_frame, text="[Reject]", 
                                bg='#2d3748', fg='#e0245e', font=('Arial', 10, 'bold'),
                                cursor='hand2')
            reject_btn.pack(side='left', padx=5)
            reject_btn.bind('<Button-1>', lambda e, cid=content_id: self.reject_content(cid))
        
        elif status == 'approved':
            post_btn = tk.Label(actions_frame, text="[Post Now]", 
                              bg='#2d3748', fg='#1da1f2', font=('Arial', 10, 'bold'),
                              cursor='hand2')
            post_btn.pack(side='left', padx=5)
            post_btn.bind('<Button-1>', lambda e, cid=content_id: self.post_content(cid))
        
        # Delete button (always available)
        delete_btn = tk.Label(actions_frame, text="[Delete]", 
                            bg='#2d3748', fg='#e0245e', font=('Arial', 10, 'bold'),
                            cursor='hand2')
        delete_btn.pack(side='left', padx=5)
        delete_btn.bind('<Button-1>', lambda e, cid=content_id: self.delete_content(cid))
        
        return content_card
    
    def update_pagination(self, total_count):
        """Update pagination controls"""
        total_pages = max(1, (total_count + self.content_page_size - 1) // self.content_page_size)
        self.page_label.config(text=f"Page {self.current_content_page} of {total_pages}")
        self.prev_btn.config(state='normal' if self.current_content_page > 1 else 'disabled')
        self.next_btn.config(state='normal' if self.current_content_page < total_pages else 'disabled')
        
        # Update count
        self.content_count_label.config(text=f"{total_count} Items")
    
    def approve_content(self, content_id):
        """Approve content for posting - OPTIMIZED"""
        def approve():
            try:
                if self.db.update_content_status(content_id, 'approved'):
                    # Clear cache to force refresh
                    self.content_cache.clear()
                    self.root.after(0, self.refresh_contents)
                    self.root.after(0, lambda: self.db.log_event("success", f"Content {content_id} approved"))
                    self.root.after(0, lambda: messagebox.showinfo("Success", "Content approved!"))
                else:
                    self.root.after(0, lambda: messagebox.showerror("Error", "Failed to approve content"))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Error", f"Error: {str(e)}"))
        
        threading.Thread(target=approve, daemon=True).start()
    
    def reject_content(self, content_id):
        """Reject content - OPTIMIZED"""
        def reject():
            try:
                if self.db.update_content_status(content_id, 'rejected'):
                    # Clear cache to force refresh
                    self.content_cache.clear()
                    self.root.after(0, self.refresh_contents)
                    self.root.after(0, lambda: self.db.log_event("info", f"Content {content_id} rejected"))
                    self.root.after(0, lambda: messagebox.showinfo("Success", "Content rejected!"))
                else:
                    self.root.after(0, lambda: messagebox.showerror("Error", "Failed to reject content"))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Error", f"Error: {str(e)}"))
        
        threading.Thread(target=reject, daemon=True).start()
    
    def delete_content(self, content_id):
        """Delete content - OPTIMIZED"""
        def delete():
            try:
                if self.db.delete_content(content_id):
                    # Clear cache to force refresh
                    self.content_cache.clear()
                    self.root.after(0, self.refresh_contents)
                    self.root.after(0, lambda: self.db.log_event("info", f"Content {content_id} deleted"))
                    self.root.after(0, lambda: messagebox.showinfo("Success", "Content deleted!"))
                else:
                    self.root.after(0, lambda: messagebox.showerror("Error", "Failed to delete content"))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Error", f"Error: {str(e)}"))
        
        threading.Thread(target=delete, daemon=True).start()
    
    def post_content(self, content_id):
        """Post content to Twitter - OPTIMIZED"""
        def post():
            try:
                # Get content details
                contents = self.db.get_contents(limit=10000)
                content = None
                for c in contents:
                    if c['id'] == str(content_id):
                        content = c
                        break
                
                if not content:
                    self.root.after(0, lambda: messagebox.showerror("Error", "Content not found"))
                    return
                
                # Prepare tweet content
                custom_text = self.ai_settings.get('custom_text', '')
                tweet_content = f"{custom_text}\n\n{content['title']}\n\n{content['content'][:200]}..."
                
                # Post to Twitter
                result = self.twitter_service.post_tweet(tweet_content)
                if result['success']:
                    self.db.update_content_status(content_id, 'posted')
                    # Clear cache to force refresh
                    self.content_cache.clear()
                    self.root.after(0, self.refresh_contents)
                    self.root.after(0, lambda: self.db.log_event("success", f"Content {content_id} posted to Twitter"))
                    self.root.after(0, lambda: messagebox.showinfo("Success", "Content posted successfully!"))
                else:
                    self.root.after(0, lambda: messagebox.showerror("Error", f"Failed to post: {result.get('error', 'Unknown error')}"))
                    
            except Exception as e:
                error_msg = f"Error posting content: {e}"
                self.root.after(0, lambda: messagebox.showerror("Error", error_msg))
                self.root.after(0, lambda: self.db.log_event("error", error_msg))
        
        threading.Thread(target=post, daemon=True).start()
    
    def prev_content_page(self):
        """Go to previous content page"""
        if self.current_content_page > 1:
            self.current_content_page -= 1
            self.refresh_contents()
    
    def next_content_page(self):
        """Go to next content page"""
        self.current_content_page += 1
        self.refresh_contents()
    
    def bulk_approve_contents(self):
        """Bulk approve all visible contents - OPTIMIZED"""
        def bulk_approve():
            try:
                contents = self.db.get_contents(
                    self.content_status_filter,
                    self.content_search_term,
                    self.content_page_size,
                    (self.current_content_page - 1) * self.content_page_size
                )
                
                approved_count = 0
                for content in contents:
                    if content['status'] == 'pending':
                        if self.db.update_content_status(content['id'], 'approved'):
                            approved_count += 1
                
                # Clear cache to force refresh
                self.content_cache.clear()
                self.root.after(0, self.refresh_contents)
                self.root.after(0, lambda: messagebox.showinfo("Success", f"Approved {approved_count} contents!"))
                self.root.after(0, lambda: self.db.log_event("success", f"Bulk approved {approved_count} contents"))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Error", f"Error: {str(e)}"))
        
        if messagebox.askyesno("Bulk Approve", "Approve all visible contents?"):
            threading.Thread(target=bulk_approve, daemon=True).start()
    
    def refresh_stats(self):
        """Refresh statistics display"""
        try:
            stats = self.db.load_statistics()
            
            # Update main stats
            for key, label in self.stat_cards.items():
                value = stats.get(key, 0)
                label.config(text=str(value))
            
            # Calculate performance metrics
            total_scanned = stats.get('total_scanned', 0)
            ai_approved = stats.get('ai_approved', 0)
            posted = stats.get('posted', 0)
            
            if total_scanned > 0:
                efficiency = (posted / total_scanned) * 100
                approval_rate = (ai_approved / total_scanned) * 100
                success_rate = (posted / max(ai_approved, 1)) * 100
                
                self.perf_labels['efficiency'].config(text=f"{efficiency:.1f}%")
                self.perf_labels['approval_rate'].config(text=f"{approval_rate:.1f}%")
                self.perf_labels['success_rate'].config(text=f"{success_rate:.1f}%")
            else:
                for label in self.perf_labels.values():
                    label.config(text="0%")
            
            # Update system information
            self.sys_labels['last_scan'].config(text=stats.get('last_scan', 'Never') or 'Never')
            self.sys_labels['last_tweet'].config(text=stats.get('last_tweet', 'Never') or 'Never')
            self.sys_labels['system_uptime'].config(text=stats.get('system_uptime', '0 days, 0 hours'))
            self.sys_labels['next_scan'].config(text=stats.get('next_scan', 'Not scheduled') or 'Not scheduled')
            
        except Exception as e:
            logging.error(f"Error refreshing stats: {e}")
            self.db.log_event("error", f"Error refreshing stats: {e}")
    
    def refresh_logs(self):
        """Refresh system logs"""
        try:
            level_filter = self.log_filter_var.get()
            logs = self.db.get_logs(level_filter)
            
            self.logs_text.delete(1.0, tk.END)
            
            for log in logs:
                # Extract log level for coloring
                log_level = "INFO"
                if '[SUCCESS]' in log:
                    log_level = "SUCCESS"
                elif '[WARNING]' in log:
                    log_level = "WARNING"
                elif '[ERROR]' in log:
                    log_level = "ERROR"
                
                self.logs_text.insert(tk.END, log + "\n", log_level)
            
        except Exception as e:
            logging.error(f"Error refreshing logs: {e}")
    
    # Core functionality methods (enhanced)
    def save_account_settings(self):
        """Save account settings with validation"""
        try:
            # Update accounts object
            self.accounts.source = self.source_var.get().strip()
            self.accounts.target = self.target_var.get().strip()
            self.accounts.consumer_key = self.consumer_key_var.get().strip()
            self.accounts.consumer_secret = self.consumer_secret_var.get().strip()
            self.accounts.access_token = self.access_token_var.get().strip()
            self.accounts.access_token_secret = self.access_token_secret_var.get().strip()
            self.accounts.bearer_token = self.bearer_token_var.get().strip()
            
            # Validate required fields
            if not all([self.accounts.source, self.accounts.target]):
                messagebox.showerror("Error", "Source and Target accounts are required")
                return
            
            # Save to database
            self.db.save_setting('accounts', self.accounts.__dict__)
            
            # Initialize Twitter client
            success = self.twitter_service.initialize_client(self.accounts)
            
            if success:
                messagebox.showinfo("Success", "Account settings saved and Twitter client initialized successfully!")
                self.db.log_event("success", "Account settings saved and Twitter client initialized")
            else:
                messagebox.showwarning("Warning", "Account settings saved but Twitter client initialization failed. Check your API credentials.")
                self.db.log_event("warning", "Account settings saved but Twitter client initialization failed")
            
        except Exception as e:
            error_msg = f"Failed to save account settings: {e}"
            messagebox.showerror("Error", error_msg)
            self.db.log_event("error", error_msg)
    
    def verify_accounts(self):
        """Verify Twitter account credentials with enhanced feedback"""
        def verify():
            try:
                # Test API connection
                result = self.twitter_service.test_connection()
                if result['success']:
                    # Test source account
                    source_result = self.twitter_service.get_user_tweets(self.accounts.source, 2)
                    # Test target account  
                    target_result = self.twitter_service.get_user_tweets(self.accounts.target, 2)
                    
                    messagebox.showinfo("Success", 
                                      f"✅ Both accounts verified successfully!\n\n"
                                      f"Source (@{self.accounts.source}): {len(source_result.get('tweets', []))} tweets found\n"
                                      f"Target (@{self.accounts.target}): {len(target_result.get('tweets', []))} tweets found")
                    self.db.log_event("success", "Both Twitter accounts verified")
                else:
                    messagebox.showerror("Error", result.get('error', 'Verification failed'))
                    self.db.log_event("error", f"Account verification failed: {result.get('error')}")
            except Exception as e:
                error_msg = f"Verification failed: {e}"
                messagebox.showerror("Error", error_msg)
                self.db.log_event("error", error_msg)
        
        threading.Thread(target=verify, daemon=True).start()
    
    def test_twitter_connection(self):
        """Test Twitter API connection"""
        def test():
            try:
                result = self.twitter_service.test_connection()
                if result['success']:
                    messagebox.showinfo("Success", 
                                      f"Twitter API connection successful!\n"
                                      f"Username: {result['username']}\n"
                                      f"ID: {result['id']}")
                    self.db.log_event("success", "Twitter API connection test passed")
                else:
                    messagebox.showerror("Error", result.get('error', 'Connection test failed'))
                    self.db.log_event("error", f"Twitter API connection test failed: {result.get('error')}")
            except Exception as e:
                error_msg = f"Connection test failed: {e}"
                messagebox.showerror("Error", error_msg)
                self.db.log_event("error", error_msg)
        
        threading.Thread(target=test, daemon=True).start()
    
    def verify_single_account(self, account_type):
        """Verify single account"""
        username = getattr(self.accounts, account_type, "")
        if not username:
            messagebox.showwarning("Warning", f"Please set {account_type} account first")
            return
        
        def verify():
            try:
                result = self.twitter_service.get_user_tweets(username, 3)
                if result['success']:
                    messagebox.showinfo("Success", 
                                      f"✅ {account_type.capitalize()} account verified!\n"
                                      f"Username: @{username}\n"
                                      f"Tweets found: {len(result['tweets'])}")
                    self.db.log_event("success", f"{account_type} account verified: @{username}")
                else:
                    messagebox.showerror("Error", result.get('error', 'Verification failed'))
                    self.db.log_event("error", f"{account_type} account verification failed: {result.get('error')}")
            except Exception as e:
                error_msg = f"Verification failed: {e}"
                messagebox.showerror("Error", error_msg)
                self.db.log_event("error", error_msg)
        
        threading.Thread(target=verify, daemon=True).start()
    
    def save_news_settings(self):
        """Save news sources settings"""
        try:
            self.news_settings['scan_interval'] = int(self.scan_interval_var.get())
            self.news_settings['max_feeds'] = int(self.max_feeds_var.get())
            
            # Save to database
            self.db.save_setting('news_settings', self.news_settings)
            
            # Restart auto-scan
            self.start_auto_scan()
            
            messagebox.showinfo("Success", 
                              f"News settings saved!\n"
                              f"Sources: {len(self.news_settings['sources'])}\n"
                              f"Scan interval: {self.news_settings['scan_interval']} minutes\n"
                              f"Max feeds: {self.news_settings['max_feeds']}")
            
            self.db.log_event("success", "News settings saved")
            
        except Exception as e:
            error_msg = f"Failed to save news settings: {e}"
            messagebox.showerror("Error", error_msg)
            self.db.log_event("error", error_msg)
    
    def select_all_sources(self):
        """Select all news sources"""
        feeds = self.news_scraper.get_enhanced_rss_feeds()
        self.news_settings['sources'] = [feed['name'] for feed in feeds]
        self.populate_sources_tree()
        messagebox.showinfo("Success", "All sources selected")
    
    def deselect_all_sources(self):
        """Deselect all news sources"""
        self.news_settings['sources'] = []
        self.populate_sources_tree()
        messagebox.showinfo("Success", "All sources deselected")
    
    def test_all_sources(self):
        """Test all selected sources"""
        if not self.news_settings['sources']:
            messagebox.showwarning("Warning", "No sources selected to test")
            return
        
        def test_sources():
            try:
                successful = 0
                total = len(self.news_settings['sources'])
                
                for i, source_name in enumerate(self.news_settings['sources']):
                    # Find feed info
                    feed_info = None
                    for feed in self.news_scraper.get_enhanced_rss_feeds():
                        if feed['name'] == source_name:
                            feed_info = feed
                            break
                    
                    if feed_info:
                        articles = self.news_scraper.scrape_feed_with_retry(feed_info)
                        if articles:
                            successful += 1
                
                messagebox.showinfo("Test Results", 
                                  f"Source testing completed!\n\n"
                                  f"Successful: {successful}/{total}\n"
                                  f"Success rate: {(successful/total)*100:.1f}%")
                self.db.log_event("info", f"Source testing completed: {successful}/{total} successful")
                
            except Exception as e:
                messagebox.showerror("Error", f"Source testing failed: {e}")
                self.db.log_event("error", f"Source testing failed: {e}")
        
        threading.Thread(target=test_sources, daemon=True).start()
        messagebox.showinfo("Info", "Testing selected sources...")
    
    def start_manual_scan(self):
        """Start manual news scan"""
        if self.is_scanning:
            messagebox.showwarning("Warning", "Scan already in progress")
            return
        
        def scan():
            self.is_scanning = True
            try:
                self.scan_news_sources()
            finally:
                self.is_scanning = False
        
        threading.Thread(target=scan, daemon=True).start()
        messagebox.showinfo("Info", "News scanning started...")
        self.db.log_event("info", "Manual news scan started")
    
    def scan_news_sources(self):
        """Enhanced news scanning with real data"""
        try:
            logging.info("Starting enhanced news scan...")
            self.db.log_event("info", "Starting enhanced news scan")
            
            # Get articles from all feeds with enhanced scraping
            articles = self.news_scraper.scrape_all_feeds_enhanced(
                max_feeds=self.news_settings['max_feeds']
            )
            
            # Analyze with enhanced AI
            approved_count = 0
            for article in articles:
                ai_result = self.ai_analyzer.analyze_with_turkish_support(
                    article.title + " " + article.content,
                    self.ai_settings['keywords']
                )
                
                if ai_result['approved']:
                    approved_count += 1
                    # Save to database with custom text
                    content_data = {
                        'type': 'news',
                        'title': article.title,
                        'content': article.content,
                        'source': article.source,
                        'url': article.url,
                        'country': article.country,
                        'language': article.language,
                        'category': article.category,
                        'source_reliability': article.source_reliability,
                        'ai_analysis': ai_result,
                        'custom_text': self.ai_settings['custom_text'],
                        'status': 'pending'
                    }
                    self.db.save_content(content_data)
            
            # Update statistics
            current_stats = self.db.load_statistics()
            current_stats['total_scanned'] = current_stats.get('total_scanned', 0) + len(articles)
            current_stats['ai_approved'] = current_stats.get('ai_approved', 0) + approved_count
            current_stats['last_scan'] = datetime.now().isoformat()
            
            # Calculate next scan time
            next_scan = datetime.now() + timedelta(minutes=self.news_settings['scan_interval'])
            current_stats['next_scan'] = next_scan.isoformat()
            
            self.db.save_statistics(current_stats)
            
            # Refresh UI
            self.refresh_contents()
            self.refresh_stats()
            
            logging.info(f"Scan completed. Found {len(articles)} articles, {approved_count} approved.")
            self.db.log_event("success", 
                           f"Scan completed: {len(articles)} articles, {approved_count} approved")
            
            # Show notification
            self.root.after(0, lambda: messagebox.showinfo(
                "Scan Complete", 
                f"Found {len(articles)} articles\n{approved_count} approved by AI"
            ))
            
        except Exception as e:
            logging.error(f"Scan failed: {e}")
            self.db.log_event("error", f"Scan failed: {e}")
            self.root.after(0, lambda: messagebox.showerror("Scan Failed", str(e)))
    
    def start_auto_scan(self):
        """Start automatic scanning based on interval"""
        if self.auto_scan_thread and self.auto_scan_thread.is_alive():
            return
        
        def auto_scan_loop():
            while not self.stop_auto_scan:
                try:
                    if self.news_settings['sources'] and not self.is_scanning:
                        logging.info("Auto-scan triggered")
                        self.db.log_event("info", "Auto-scan triggered")
                        self.scan_news_sources()
                    
                    # Wait for next scan
                    interval = self.news_settings.get('scan_interval', 10)
                    time.sleep(interval * 60)
                    
                except Exception as e:
                    logging.error(f"Auto-scan error: {e}")
                    self.db.log_event("error", f"Auto-scan error: {e}")
                    time.sleep(60)  # Wait 1 minute before retrying
        
        self.stop_auto_scan = False
        self.auto_scan_thread = threading.Thread(target=auto_scan_loop, daemon=True)
        self.auto_scan_thread.start()
        logging.info("Auto-scan started")
    
    def stop_auto_scan_manual(self):
        """Stop automatic scanning manually"""
        self.stop_auto_scan = True
        messagebox.showinfo("Info", "Auto-scan stopped")
        self.db.log_event("info", "Auto-scan stopped manually")
    
    def start_tweet_monitoring(self):
        """Start monitoring tweets from followed users"""
        if self.tweet_monitor_thread and self.tweet_monitor_thread.is_alive():
            return
        
        def tweet_monitor_loop():
            while not self.stop_tweet_monitoring:
                try:
                    if (self.ai_settings['enable_tweet_monitoring'] and 
                        self.accounts.source and 
                        not self.is_scanning):
                        
                        logging.info("Tweet monitoring triggered")
                        self.db.log_event("info", "Tweet monitoring triggered")
                        
                        # Get tweets from followed users using Nitter scraper
                        tweets = self.nitter_scraper.get_followed_users_tweets(
                            self.accounts.source, 
                            max_tweets=20
                        )
                        
                        # Analyze tweets with AI
                        approved_count = 0
                        for tweet in tweets:
                            ai_result = self.ai_analyzer.analyze_with_turkish_support(
                                tweet.text,
                                self.ai_settings['keywords']
                            )
                            
                            if ai_result['approved']:
                                approved_count += 1
                                # Save to database
                                content_data = {
                                    'type': 'tweet',
                                    'title': tweet.text[:100] + "..." if len(tweet.text) > 100 else tweet.text,
                                    'content': tweet.text,
                                    'source': 'Twitter',
                                    'username': tweet.username,
                                    'ai_analysis': ai_result,
                                    'custom_text': self.ai_settings['custom_text'],
                                    'status': 'pending'
                                }
                                self.db.save_content(content_data)
                        
                        if approved_count > 0:
                            # Update statistics
                            current_stats = self.db.load_statistics()
                            current_stats['total_scanned'] = current_stats.get('total_scanned', 0) + len(tweets)
                            current_stats['ai_approved'] = current_stats.get('ai_approved', 0) + approved_count
                            current_stats['last_tweet'] = datetime.now().isoformat()
                            self.db.save_statistics(current_stats)
                            
                            # Refresh UI
                            self.root.after(0, self.refresh_contents)
                            self.root.after(0, self.refresh_stats)
                            
                            logging.info(f"Tweet monitoring: Found {len(tweets)} tweets, {approved_count} approved.")
                            self.db.log_event("success", 
                                           f"Tweet monitoring: {len(tweets)} tweets, {approved_count} approved")
                    
                    # Wait for next check
                    interval = self.ai_settings.get('tweet_monitoring_interval', 5)
                    time.sleep(interval * 60)
                    
                except Exception as e:
                    logging.error(f"Tweet monitoring error: {e}")
                    self.db.log_event("error", f"Tweet monitoring error: {e}")
                    time.sleep(60)  # Wait 1 minute before retrying
        
        self.stop_tweet_monitoring = False
        self.tweet_monitor_thread = threading.Thread(target=tweet_monitor_loop, daemon=True)
        self.tweet_monitor_thread.start()
        logging.info("Tweet monitoring started")
        self.status_text.config(text="Monitoring Active", fg='#17bf63')
        self.status_indicator.config(fg='#17bf63')
    
    def stop_tweet_monitoring_manual(self):
        """Stop tweet monitoring manually"""
        self.stop_tweet_monitoring = True
        messagebox.showinfo("Info", "Tweet monitoring stopped")
        self.db.log_event("info", "Tweet monitoring stopped manually")
        self.status_text.config(text="System Active", fg='#17bf63')
        self.status_indicator.config(fg='#17bf63')
    
    def test_tweet_monitoring(self):
        """Test tweet monitoring functionality"""
        def test():
            try:
                if not self.accounts.source:
                    messagebox.showwarning("Warning", "Please set Source Account first")
                    return
                
                tweets = self.nitter_scraper.get_followed_users_tweets(self.accounts.source, 5)
                messagebox.showinfo("Test Results", 
                                  f"Tweet monitoring test completed!\n\n"
                                  f"Tweets found: {len(tweets)}\n"
                                  f"Sample usernames: {', '.join(set(t.username for t in tweets[:3]))}")
                self.db.log_event("info", f"Tweet monitoring test: {len(tweets)} tweets found")
                
            except Exception as e:
                messagebox.showerror("Error", f"Tweet monitoring test failed: {e}")
                self.db.log_event("error", f"Tweet monitoring test failed: {e}")
        
        threading.Thread(target=test, daemon=True).start()
        messagebox.showinfo("Info", "Testing tweet monitoring...")
    
    def add_keyword(self):
        """Add new keyword"""
        keyword = self.new_keyword_var.get().strip()
        if keyword and keyword not in self.ai_settings['keywords']:
            self.ai_settings['keywords'].append(keyword)
            self.keywords_listbox.insert(tk.END, keyword)
            self.new_keyword_var.set("")
    
    def remove_keyword(self):
        """Remove selected keyword"""
        selection = self.keywords_listbox.curselection()
        if selection:
            keyword = self.keywords_listbox.get(selection[0])
            self.ai_settings['keywords'].remove(keyword)
            self.keywords_listbox.delete(selection[0])
    
    def clear_keywords(self):
        """Clear all keywords"""
        if messagebox.askyesno("Clear Keywords", "Remove all keywords?"):
            self.ai_settings['keywords'] = []
            self.keywords_listbox.delete(0, tk.END)
    
    def add_english_keywords(self):
        """Add common English keywords"""
        english_keywords = ['stocks', 'sales', 'market', 'news', 'technology', 'business', 'finance', 'crypto']
        added = 0
        
        for keyword in english_keywords:
            if keyword not in self.ai_settings['keywords']:
                self.ai_settings['keywords'].append(keyword)
                self.keywords_listbox.insert(tk.END, keyword)
                added += 1
        
        if added > 0:
            messagebox.showinfo("Success", f"Added {added} English keywords")
        else:
            messagebox.showinfo("Info", "All English keywords already present")
    
    def add_turkish_keywords(self):
        """Add Turkish keyword equivalents"""
        turkish_keywords = ['hisse', 'borsa', 'satış', 'piyasa', 'haber', 'teknoloji', 'iş', 'finans']
        added = 0
        
        for keyword in turkish_keywords:
            if keyword not in self.ai_settings['keywords']:
                self.ai_settings['keywords'].append(keyword)
                self.keywords_listbox.insert(tk.END, keyword)
                added += 1
        
        if added > 0:
            messagebox.showinfo("Success", f"Added {added} Turkish keywords")
        else:
            messagebox.showinfo("Info", "All Turkish keywords already present")
    
    def save_ai_settings(self):
        """Save AI settings"""
        try:
            self.ai_settings['custom_text'] = self.custom_text_var.get()
            self.ai_settings['enable_sentiment'] = self.enable_sentiment_var.get()
            self.ai_settings['require_approval'] = self.require_approval_var.get()
            self.ai_settings['enable_tweet_monitoring'] = self.enable_tweet_monitoring_var.get()
            self.ai_settings['tweet_monitoring_interval'] = int(self.tweet_interval_var.get())
            
            # Save to database
            self.db.save_setting('ai_settings', self.ai_settings)
            
            # Restart tweet monitoring if settings changed
            self.start_tweet_monitoring()
            
            messagebox.showinfo("Success", "AI settings saved successfully!")
            self.db.log_event("success", "AI settings saved")
            
        except Exception as e:
            error_msg = f"Failed to save AI settings: {e}"
            messagebox.showerror("Error", error_msg)
            self.db.log_event("error", error_msg)
    
    def generate_report(self):
        """Generate statistics report"""
        try:
            stats = self.db.load_statistics()
            report = f"""
X Bot Manager - Statistics Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

📊 Content Statistics:
• Total Scanned: {stats.get('total_scanned', 0)}
• AI Approved: {stats.get('ai_approved', 0)}
• Posted: {stats.get('posted', 0)}
• Rejected: {stats.get('rejected', 0)}

🔄 System Information:
• Last Scan: {stats.get('last_scan', 'Never')}
• Last Tweet: {stats.get('last_tweet', 'Never')}
• System Uptime: {stats.get('system_uptime', '0 days, 0 hours')}
• Next Scan: {stats.get('next_scan', 'Not scheduled')}

🤖 AI Configuration:
• Keywords: {len(self.ai_settings['keywords'])}
• Sentiment Analysis: {'Enabled' if self.ai_settings['enable_sentiment'] else 'Disabled'}
• Auto-approval: {'Disabled' if self.ai_settings['require_approval'] else 'Enabled'}
• Tweet Monitoring: {'Enabled' if self.ai_settings['enable_tweet_monitoring'] else 'Disabled'}

📰 News Sources:
• Selected Sources: {len(self.news_settings['sources'])}
• Scan Interval: {self.news_settings['scan_interval']} minutes
• Max Feeds: {self.news_settings['max_feeds']}
            """
            
            # Show report in messagebox
            messagebox.showinfo("Statistics Report", report)
            self.db.log_event("info", "Statistics report generated")
            
        except Exception as e:
            error_msg = f"Failed to generate report: {e}"
            messagebox.showerror("Error", error_msg)
            self.db.log_event("error", error_msg)
    
    def reset_statistics(self):
        """Reset all statistics"""
        if messagebox.askyesno("Reset Statistics", 
                              "Are you sure you want to reset all statistics? This action cannot be undone."):
            try:
                stats = {
                    'total_scanned': 0,
                    'ai_approved': 0,
                    'posted': 0,
                    'rejected': 0,
                    'last_scan': None,
                    'last_tweet': None,
                    'last_news': None,
                    'system_uptime': '0 days, 0 hours',
                    'next_scan': None
                }
                self.db.save_statistics(stats)
                self.refresh_stats()
                messagebox.showinfo("Success", "Statistics reset successfully")
                self.db.log_event("info", "Statistics reset")
            except Exception as e:
                error_msg = f"Failed to reset statistics: {e}"
                messagebox.showerror("Error", error_msg)
                self.db.log_event("error", error_msg)
    
    def export_logs(self):
        """Export system logs to file"""
        try:
            logs = self.db.get_logs(limit=1000)
            
            filename = f"system_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("X Bot Manager - System Logs\n")
                f.write(f"Exported: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("=" * 50 + "\n\n")
                
                for log in logs:
                    f.write(log + "\n")
            
            messagebox.showinfo("Success", f"Logs exported to {filename}")
            self.db.log_event("info", f"Logs exported to {filename}")
            
        except Exception as e:
            error_msg = f"Failed to export logs: {e}"
            messagebox.showerror("Error", error_msg)
            self.db.log_event("error", error_msg)
    
    def clear_logs(self):
        """Clear system logs"""
        if messagebox.askyesno("Clear Logs", 
                              "Are you sure you want to clear all system logs? This action cannot be undone."):
            try:
                # Clear logs file
                log_file = os.path.join(self.db.data_dir, "system_logs.txt")
                if os.path.exists(log_file):
                    os.remove(log_file)
                
                self.refresh_logs()
                messagebox.showinfo("Success", "Logs cleared successfully")
                self.db.log_event("info", "Logs cleared")
            except Exception as e:
                error_msg = f"Failed to clear logs: {e}"
                messagebox.showerror("Error", error_msg)
                self.db.log_event("error", error_msg)
    
    def on_account_change(self, field):
        """Handle account field changes"""
        # Enable/disable verify buttons based on field completion
        pass
    
    def load_settings(self):
        """Load saved settings from database"""
        try:
            # Load account settings
            accounts_data = self.db.get_setting('accounts')
            if accounts_data:
                self.accounts = TwitterAccount(**accounts_data)
            
            # Load AI settings
            ai_data = self.db.get_setting('ai_settings')
            if ai_data:
                self.ai_settings.update(ai_data)
            
            # Load news settings
            news_data = self.db.get_setting('news_settings')
            if news_data:
                self.news_settings.update(news_data)
                
        except Exception as e:
            logging.error(f"Error loading settings: {e}")
            self.db.log_event("error", f"Error loading settings: {e}")
    
    def on_closing(self):
        """Handle application closing"""
        self.stop_auto_scan = True
        self.stop_tweet_monitoring = True
        if self.nitter_scraper:
            self.nitter_scraper.close()
        self.db.log_event("info", "Application closing")
        self.root.destroy()

def main():
    """Main application entry point"""
    try:
        root = tk.Tk()
        app = ModernTkinterDashboard(root)
        
        # Set closing protocol
        root.protocol("WM_DELETE_WINDOW", app.on_closing)
        
        root.mainloop()
    except Exception as e:
        logging.error(f"Application error: {e}")
        messagebox.showerror("Fatal Error", f"Application failed to start: {e}")

if __name__ == "__main__":
    main()