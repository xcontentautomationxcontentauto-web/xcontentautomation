#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import tweepy
import json
import sys
from datetime import datetime
import time

def test_twitter_api_essential():
    print("🚀 Testing Twitter API with Essential (Free) Tier Access...")
    print("=" * 60)
    
    # Your credentials
    credentials = {
        'consumer_key': 'BhUZdQZFlJBR6WbY71gha3S42',
        'consumer_secret': 'XWu08wx24aQhBKw6Alqxgl8GvpnzS53zzemgfRTJZcJr6yDUbs',
        'access_token': '1565838594304000001-gbYIOHFHyBc7Q0Z7y0S4CEUK8RVaIE',
        'access_token_secret': 'TPsJaaejSj7ZcFnJRHzPkMEYumF9eZr4cV62xY6I37GvB',
        'bearer_token': 'AAAAAAAAAAAAAAAAAAAAAKjn4wEAAAAAudCE9e%2BWQ5p%2B24B8hJtuy8lbA%2FQ%3DCGTPRweeHdzcsJnZN0W0jru6XgZIp9ChpI1xfEEhELM3p5m1qf'
    }
    
    all_tests_passed = True
    
    try:
        # Test 1: Initialize OAuth 1.0a (V1.1 API - More endpoints available)
        print("1. Initializing OAuth 1.0a (V1.1 API)...")
        auth = tweepy.OAuth1UserHandler(
            credentials['consumer_key'],
            credentials['consumer_secret'],
            credentials['access_token'],
            credentials['access_token_secret']
        )
        api_v1 = tweepy.API(auth, wait_on_rate_limit=True)
        print("   ✅ OAuth 1.0a initialized successfully")
        
    except Exception as e:
        print(f"   ❌ OAuth 1.0a failed: {e}")
        all_tests_passed = False
        return all_tests_passed
    
    try:
        # Test 2: Test User Authentication with V1.1 (Essential tier works)
        print("2. Testing User Authentication...")
        user_v1 = api_v1.verify_credentials()
        print(f"   ✅ Authenticated as: @{user_v1.screen_name}")
        print(f"   📛 Name: {user_v1.name}")
        print(f"   🆔 User ID: {user_v1.id}")
        print(f"   👥 Followers: {user_v1.followers_count}")
        print(f"   📊 Following: {user_v1.friends_count}")
        print(f"   🐦 Tweets: {user_v1.statuses_count}")
        print(f"   📍 Location: {getattr(user_v1, 'location', 'Not specified')}")
        
    except Exception as e:
        print(f"   ❌ User Authentication failed: {e}")
        all_tests_passed = False
    
    try:
        # Test 3: Get User Timeline (V1.1 API - Essential tier works)
        print("3. Testing Timeline Access...")
        tweets = api_v1.user_timeline(count=5)
        if tweets:
            print(f"   ✅ Retrieved {len(tweets)} recent tweets")
            for i, tweet in enumerate(tweets[:2]):
                print(f"      📝 Tweet {i+1}: {tweet.text[:60]}...")
                print(f"      📅 Created: {tweet.created_at}")
                print(f"      ❤️  Likes: {tweet.favorite_count}, 🔄 Retweets: {tweet.retweet_count}")
        else:
            print("   ℹ️  No recent tweets found")
        
    except Exception as e:
        print(f"   ❌ Timeline Access failed: {e}")
        all_tests_passed = False
    
    try:
        # Test 4: Get Home Timeline (What you see on your timeline)
        print("4. Testing Home Timeline...")
        home_tweets = api_v1.home_timeline(count=3)
        if home_tweets:
            print(f"   ✅ Retrieved {len(home_tweets)} tweets from home timeline")
            for i, tweet in enumerate(home_tweets[:2]):
                print(f"      👤 From: @{tweet.user.screen_name}")
                print(f"      📝 Tweet: {tweet.text[:50]}...")
        else:
            print("   ℹ️  No tweets in home timeline")
        
    except Exception as e:
        print(f"   ❌ Home Timeline failed: {e}")
        all_tests_passed = False
    
    try:
        # Test 5: Get Followers List
        print("5. Testing Followers Access...")
        followers = api_v1.get_followers(count=5)
        if followers:
            print(f"   ✅ Retrieved {len(followers)} followers")
            for i, follower in enumerate(followers[:3]):
                print(f"      👤 Follower {i+1}: @{follower.screen_name}")
        else:
            print("   ℹ️  No followers found")
        
    except Exception as e:
        print(f"   ❌ Followers Access failed: {e}")
        all_tests_passed = False
    
    try:
        # Test 6: Get Friends List (People you follow)
        print("6. Testing Friends List...")
        friends = api_v1.get_friends(count=5)
        if friends:
            print(f"   ✅ Retrieved {len(friends)} friends")
            for i, friend in enumerate(friends[:3]):
                print(f"      👤 Following: @{friend.screen_name}")
        else:
            print("   ℹ️  No friends found")
        
    except Exception as e:
        print(f"   ❌ Friends List failed: {e}")
        all_tests_passed = False
    
    try:
        # Test 7: Search Tweets (V1.1 API - Essential tier works)
        print("7. Testing Search Functionality...")
        search_results = api_v1.search_tweets(q="python", count=3)
        if search_results:
            print(f"   ✅ Search successful - found {len(search_results)} tweets")
            for i, tweet in enumerate(search_results[:2]):
                print(f"      🔍 Result {i+1}: @{tweet.user.screen_name} - {tweet.text[:50]}...")
        else:
            print("   ℹ️  No search results found")
        
    except Exception as e:
        print(f"   ❌ Search failed: {e}")
        all_tests_passed = False
    
    try:
        # Test 8: Test Rate Limit Status
        print("8. Checking Rate Limits...")
        rate_limits = api_v1.rate_limit_status()
        resources = rate_limits['resources']
        
        # Check important endpoints for Essential tier
        essential_endpoints = {
            'Timeline': '/statuses/home_timeline',
            'User Timeline': '/statuses/user_timeline', 
            'Search': '/search/tweets',
            'Followers': '/followers/list',
            'Friends': '/friends/list'
        }
        
        for endpoint_name, endpoint_path in essential_endpoints.items():
            for resource, limits in resources.items():
                if endpoint_path in limits:
                    limit_info = limits[endpoint_path]
                    remaining = limit_info['remaining']
                    limit = limit_info['limit']
                    print(f"   📊 {endpoint_name}: {remaining}/{limit} requests remaining")
                    break
        
    except Exception as e:
        print(f"   ❌ Rate Limit check failed: {e}")
        all_tests_passed = False
    
    # Test 9: Try posting with V1.1 API (might work for Essential)
    print("9. Testing Write Operations (V1.1 API)...")
    try:
        # Try to post a tweet using V1.1 API
        test_tweet_text = f"🤖 Test tweet from API tester - {datetime.now().strftime('%H:%M:%S')} (will delete)"
        tweet = api_v1.update_status(test_tweet_text)
        print(f"   ✅ Tweet posted successfully via V1.1 API!")
        print(f"   🆔 Tweet ID: {tweet.id}")
        print(f"   📝 Content: {test_tweet_text}")
        
        # Try to delete the test tweet
        try:
            api_v1.destroy_status(tweet.id)
            print("   🗑️  Test tweet deleted successfully")
        except Exception as delete_error:
            print(f"   ⚠️  Could not delete test tweet: {delete_error}")
            
    except tweepy.TweepyException as e:
        error_msg = str(e)
        if "403" in error_msg or "Forbidden" in error_msg:
            print("   ❌ Write operations not available with Essential access")
            print("      Essential tier only supports read operations")
            print("      Upgrade to Elevated for posting capabilities")
        elif "401" in error_msg:
            print("   ❌ Authentication failed for write operations")
        else:
            print(f"   ❌ Write operation failed: {e}")
        all_tests_passed = False
    except Exception as e:
        print(f"   ❌ Write operation failed: {e}")
        all_tests_passed = False
    
    # Summary
    print("=" * 60)
    print("📋 ESSENTIAL TIER CAPABILITIES:")
    print("✅ Read user profile and timeline")
    print("✅ Read home timeline") 
    print("✅ Read followers and friends lists")
    print("✅ Search tweets")
    print("❌ Post tweets (requires Elevated access)")
    print("❌ Retweet/like (requires Elevated access)")
    print("❌ Follow/unfollow (requires Elevated access)")
    
    if all_tests_passed:
        print("\n🎉 All available tests passed! Your credentials work for read operations.")
    else:
        print("\n⚠️  Some tests failed, but read operations should work.")
    
    return all_tests_passed

def check_app_permissions():
    """Check what permissions your app has"""
    print("\n" + "=" * 60)
    print("🔐 Checking App Permissions...")
    print("=" * 60)
    
    credentials = {
        'consumer_key': 'BhUZdQZFlJBR6WbY71gha3S42',
        'consumer_secret': 'XWu08wx24aQhBKw6Alqxgl8GvpnzS53zzemgfRTJZcJr6yDUbs',
        'access_token': '1565838594304000001-gbYIOHFHyBc7Q0Z7y0S4CEUK8RVaIE',
        'access_token_secret': 'TPsJaaejSj7ZcFnJRHzPkMEYumF9eZr4cV62xY6I37GvB',
    }
    
    try:
        auth = tweepy.OAuth1UserHandler(
            credentials['consumer_key'],
            credentials['consumer_secret'],
            credentials['access_token'],
            credentials['access_token_secret']
        )
        api = tweepy.API(auth)
        
        # Try different operations to infer permissions
        print("Testing available permissions:")
        
        # Read permissions (should work)
        try:
            user = api.verify_credentials()
            print("✅ Read permissions: Available")
        except:
            print("❌ Read permissions: Not available")
        
        # Write permissions (likely won't work)
        try:
            # Just test if we can access write endpoints, not actually write
            rate_limits = api.rate_limit_status()
            if 'statuses' in rate_limits['resources']:
                if '/statuses/update' in rate_limits['resources']['statuses']:
                    print("✅ Write permissions: Endpoint accessible (but may not work)")
                else:
                    print("❌ Write permissions: Endpoint not accessible")
        except:
            print("❌ Write permissions: Not available")
            
    except Exception as e:
        print(f"❌ Permission check failed: {e}")

def essential_tier_workarounds():
    """Show workarounds for Essential tier limitations"""
    print("\n" + "=" * 60)
    print("💡 WORKAROUNDS FOR ESSENTIAL TIER:")
    print("=" * 60)
    print("Since you have Essential (free) access, here are your options:")
    print("")
    print("1. 🆓 STAY WITH ESSENTIAL TIER:")
    print("   • Build a read-only bot (monitoring, analytics, dashboards)")
    print("   • Monitor trends, followers, and engagement")
    print("   • Create content discovery tools")
    print("")
    print("2. ⬆️ UPGRADE TO ELEVATED TIER:")
    print("   • Cost: Free (but requires application approval)")
    print("   • Allows: Posting tweets, retweeting, liking, following")
    print("   • Apply at: https://developer.x.com/en/portal/products/elevated")
    print("")
    print("3. 🔄 HYBRID APPROACH:")
    print("   • Use Essential tier for monitoring/content discovery")
    print("   • Use manual posting or other tools for sharing content")
    print("")
    print("4. 🐦 USE TWEEPY'S V1.1 API:")
    print("   • Some write operations might work with V1.1 endpoints")
    print("   • Try: api.update_status(), api.retweet(), etc.")

if __name__ == "__main__":
    print("Twitter API Essential Tier Tester")
    print("=" * 60)
    
    # Run main tests
    success = test_twitter_api_essential()
    
    # Check permissions
    check_app_permissions()
    
    # Show workarounds
    essential_tier_workarounds()
    
    print("\n" + "=" * 60)
    print("🎯 RECOMMENDATION:")
    print("Apply for Elevated access (free) to enable posting capabilities.")
    print("Meanwhile, you can build a powerful monitoring/analytics bot!")
    
    sys.exit(0 if success else 1)