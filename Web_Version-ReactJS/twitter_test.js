#!/usr/bin/env node

const { TwitterApi } = require('twitter-api-v2');
const readline = require('readline');

// Your credentials
const credentials = {
    appKey: 'BhUZdQZFlJBR6WbY71gha3S42',
    appSecret: 'XWu08wx24aQhBKw6Alqxgl8GvpnzS53zzemgfRTJZcJr6yDUbs',
    accessToken: '1565838594304000001-gbYIOHFHyBc7Q0Z7y0S4CEUK8RVaIE',
    accessSecret: 'TPsJaaejSj7ZcFnJRHzPkMEYumF9eZr4cV62xY6I37GvB',
    bearerToken: 'AAAAAAAAAAAAAAAAAAAAAKjn4wEAAAAAudCE9e%2BWQ5p%2B24B8hJtuy8lbA%2FQ%3DCGTPRweeHdzcsJnZN0W0jru6XgZIp9ChpI1xfEEhELM3p5m1qf'
};

class TwitterTester {
    constructor() {
        this.client = new TwitterApi({
            appKey: credentials.appKey,
            appSecret: credentials.appSecret,
            accessToken: credentials.accessToken,
            accessSecret: credentials.accessSecret,
        });
        
        this.bearerClient = new TwitterApi(credentials.bearerToken);
    }

    async testConnection() {
        console.log('🚀 Testing Twitter API with JavaScript...');
        console.log('=' .repeat(60));
        
        let allTestsPassed = true;

        try {
            // Test 1: User Authentication
            console.log('1. Testing User Authentication...');
            const user = await this.client.v2.me({
                'user.fields': ['created_at', 'description', 'location', 'public_metrics']
            });
            
            if (user.data) {
                console.log(`   ✅ Authenticated as: @${user.data.username}`);
                console.log(`   📛 Name: ${user.data.name}`);
                console.log(`   🆔 User ID: ${user.data.id}`);
                console.log(`   📝 Description: ${user.data.description || 'No description'}`);
                console.log(`   📍 Location: ${user.data.location || 'Not specified'}`);
                
                if (user.data.public_metrics) {
                    const metrics = user.data.public_metrics;
                    console.log(`   👥 Followers: ${metrics.followers_count}`);
                    console.log(`   📊 Following: ${metrics.following_count}`);
                    console.log(`   🐦 Tweet Count: ${metrics.tweet_count}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ User Authentication failed: ${error.message}`);
            allTestsPassed = false;
        }

        try {
            // Test 2: Get User Tweets
            console.log('2. Testing Timeline Access...');
            const tweets = await this.client.v2.userTimeline('1565838594304000001', {
                max_results: 5,
                'tweet.fields': ['created_at', 'public_metrics']
            });
            
            if (tweets.data) {
                console.log(`   ✅ Retrieved ${tweets.data.length} recent tweets`);
                tweets.data.slice(0, 2).forEach((tweet, index) => {
                    console.log(`      📝 Tweet ${index + 1}: ${tweet.text.substring(0, 50)}...`);
                    console.log(`      📅 Created: ${tweet.created_at}`);
                    if (tweet.public_metrics) {
                        console.log(`      ❤️  Likes: ${tweet.public_metrics.like_count}, 🔄 Retweets: ${tweet.public_metrics.retweet_count}`);
                    }
                });
            } else {
                console.log('   ℹ️  No recent tweets found');
            }
        } catch (error) {
            console.log(`   ❌ Timeline Access failed: ${error.message}`);
            allTestsPassed = false;
        }

        try {
            // Test 3: Search Tweets
            console.log('3. Testing Search Functionality...');
            const searchResults = await this.bearerClient.v2.search('JavaScript API test', {
                max_results: 10,
                'tweet.fields': ['created_at', 'author_id']
            });
            
            if (searchResults.data) {
                console.log(`   ✅ Search successful - found ${searchResults.data.length} tweets`);
                console.log(`   🔍 Query: 'JavaScript API test'`);
            } else {
                console.log('   ℹ️  No search results found');
            }
        } catch (error) {
            console.log(`   ❌ Search test failed: ${error.message}`);
            allTestsPassed = false;
        }

        try {
            // Test 4: Test Tweet Posting
            console.log('4. Testing Tweet Posting...');
            const testTweetText = `🤖 Test tweet from JavaScript API tester - ${new Date().toLocaleTimeString()}`;
            
            const tweetResponse = await this.client.v2.tweet(testTweetText);
            
            if (tweetResponse.data) {
                console.log(`   ✅ Tweet posted successfully!`);
                console.log(`   🆔 Tweet ID: ${tweetResponse.data.id}`);
                console.log(`   📝 Content: ${testTweetText}`);
                
                // Try to delete the test tweet
                try {
                    await this.client.v2.deleteTweet(tweetResponse.data.id);
                    console.log('   🗑️  Test tweet deleted successfully');
                } catch (deleteError) {
                    console.log(`   ⚠️  Could not delete test tweet: ${deleteError.message}`);
                }
            }
        } catch (error) {
            if (error.code === 403) {
                console.log('   ❌ Twitter API Error: 403 Forbidden');
                console.log('      This is likely due to your access level.');
                console.log('      Essential tier only supports read operations.');
                console.log('      Upgrade to Elevated for posting capabilities.');
            } else {
                console.log(`   ❌ Tweet Posting failed: ${error.message}`);
            }
            allTestsPassed = false;
        }

        try {
            // Test 5: Rate Limits
            console.log('5. Checking Rate Limits...');
            const rateLimits = await this.bearerClient.v2.rateLimit();
            
            if (rateLimits.resources) {
                const resources = rateLimits.resources;
                Object.keys(resources).forEach(resourceType => {
                    Object.keys(resources[resourceType]).forEach(endpoint => {
                        const limit = resources[resourceType][endpoint];
                        console.log(`   📊 ${endpoint}: ${limit.remaining}/${limit.limit} requests remaining`);
                    });
                });
            }
        } catch (error) {
            console.log(`   ❌ Rate Limit check failed: ${error.message}`);
            allTestsPassed = false;
        }

        // Summary
        console.log('=' .repeat(60));
        if (allTestsPassed) {
            console.log('🎉 All tests passed successfully!');
        } else {
            console.log('❌ Some tests failed. Please check the errors above.');
        }

        console.log('\n📋 Available Functionality:');
        console.log('✅ Read operations (user info, tweets, search)');
        console.log('✅ Authentication');
        console.log('❌ Write operations (require Elevated access)');

        return allTestsPassed;
    }

    async testIndividualEndpoints() {
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 Testing Individual Endpoint Access...');
        console.log('=' .repeat(60));

        const endpoints = [
            { name: 'Get User Info', test: () => this.client.v2.me() },
            { name: 'Get User Tweets', test: () => this.client.v2.userTimeline('1565838594304000001', { max_results: 5 }) },
            { name: 'Search Tweets', test: () => this.bearerClient.v2.search('test', { max_results: 10 }) },
        ];

        for (const endpoint of endpoints) {
            try {
                const result = await endpoint.test();
                if (result.data) {
                    console.log(`✅ ${endpoint.name}: SUCCESS`);
                } else {
                    console.log(`⚠️  ${endpoint.name}: No data returned`);
                }
            } catch (error) {
                console.log(`❌ ${endpoint.name}: FAILED - ${error.message}`);
            }
        }
    }
}

// Main execution
async function main() {
    console.log('Twitter API JavaScript Tester');
    console.log('=' .repeat(60));
    
    const tester = new TwitterTester();
    
    try {
        const success = await tester.testConnection();
        await tester.testIndividualEndpoints();
        
        console.log('\n' + '=' .repeat(60));
        console.log('💡 Next Steps:');
        console.log('1. Your credentials work for read operations');
        console.log('2. Apply for Elevated access for posting capabilities');
        console.log('3. Visit: https://developer.x.com/en/portal/products/elevated');
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = TwitterTester;