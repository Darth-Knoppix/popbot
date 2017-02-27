/* jshint esversion: 6 */

// https://nlp-expo.firebaseapp.com/
// https://github.com/nlp-compromise/compromise

// https://community.risingstack.com/node-js-twitter-bot-tutorial/
// https://github.com/ttezel/twit

const config 	= require('./config.js');
const twit 		= require('twit');
const comp 		= require('compromise');
const fs 		= require('fs');
const sentiment = require('sentiment');
const summarizer = require('nodejs-text-summarizer')
const giphy = require('giphy-api')();

const Twitter = new twit(config);

const happyEmoji = ['', '😀', '😃', '😄', '😁', '😊'];
const sadEmoji = ['😞', '🙁', '😫', '😤', '😕', '😡'];

let lastUpdated;

const chooseRandom = (array) => {
	return array[Math.floor(Math.random() * array.length)];
};

const isPerson = (word) => {
	return hasBestTag(word, 'Person') && !hasTag(word, 'Acronym');
};

const isNoun = (word) => {
	return hasTag(word, 'Noun') && !hasTag(word, 'Pronoun') && !hasTag(word, 'Conjunction');
};

const isLastName = (word) => {
	return hasTag(word, 'LastName');
};

const isFirstName = (word) => {
	return hasTag(word, 'FirstName');
};

const isEmoji = (word) => {
	return hasTag(word, 'Emoji');
};

const isUrl = (word) => {
	return hasTag(word, 'Url');
};

const isAdverb = (word) => {
	return hasTag(word, 'Adverb');
}

const isVerb = (word) => {
	return hasTag(word, 'Verb');
};

const isPlace = (word) => {
	return hasTag(word, 'Demonym');
};

const hasTag = (word, tag) => {
	if(!tag || !word){
		return false;
	}

	return word.tags.includes(tag);
};

const hasBestTag = (word, tag) => {
	if(!tag || !word){
		return false;
	}

	if(word.bestTag ? word.bestTag === tag : false){
		return true
	}else{
		return hasTag(word, tag);
	}
};

const manufactureTweet = (tweetNLP, wordBag, sentiment) => {
	let newTweet = [];
	tweetNLP.out('terms').forEach((word) => {
		let newWord = word;

		// if(isPerson(newWord)){
		// 	let names = chooseRandom(wordBag.people);
		// 	let name = names;

		// 	if(isFirstName(newWord) && newWord.length > 1){
		// 		name = newWord.firstName;
		// 	}

		// 	if(isLastName(newWord) && newWord.length > 1){
		// 		name = newWord.lastName;
		// 	}

		// 	newWord = name.normal.charAt(0).toUpperCase() + name.normal.slice(1);
		// }else
		if(isUrl(newWord) || newWord.text.includes('@') || newWord.text.includes('RT') || newWord.text.includes('http')){
			newWord = '';
		}
		// }else if(isAdverb(newWord)){
		// 	let data = fs.readFileSync('./adverbs.json', 'utf8');

		// 	const adverbs = JSON.parse(data);
		// 	newWord = chooseRandom(adverbs);
		// }else{
		// 	console.log(newWord);
		// }
		// else if(isPlace(newWord) && wordBag.places.length > 0){
		// 	newWord = chooseRandom(wordBag.places);
		// }

		// else if(isVerb(newWord) && !hasTag(newWord, 'Contraction')){
		// 	let data = fs.readFileSync('./verbs.json', 'utf8');

		// 	const verbs = JSON.parse(data).verbs;
		// 	let newVerb = chooseRandom(verbs);

		// 	if(hasTag(newWord, 'PresentTense')){
		// 		if(hasTag(newWord, 'Gerund')){
		// 			let verb = nlp(newVerb.present);

		// 			console.log(verb.verbs().conjugate());
		// 			newWord = verb.sentences().toPresentTense().out('text');
		// 		}else{
		// 			newWord = newVerb.present;
		// 		}
		// 	}else if(hasTag(newWord, 'PastTense')){
		// 		newWord = newVerb.past;
		// 	}
		// }

		if(newWord != word){
			console.log('Replaced "' + word.normal + '" with "' + newWord + '"');
			console.log(word);
			console.log(newWord);
		}else{
			newWord = newWord.text;
		}

		newTweet.push(newWord);
	});

	console.log(newTweet);

	newTweet = newTweet.filter((text) => {
		return text.length > 0;
	});

	let sentence = newTweet.join(' ');

	let nlpSentence = nlp(sentence);

	let tweet;
	let indicator;
	tweet = nlpSentence;

	if(sentiment.score > 0){
		indicator = chooseRandom(happyEmoji);
	}else{
		indicator = chooseRandom(sadEmoji);
	}

	return tweet.sentences().toPresentTense().out('text') + ' ' + indicator;
};

const searchForTweets = (trend_param) => {
	const tweetList = [];
	Twitter.get('search/tweets', trend_param, (error, data, response) =>{
		if(!error){
			const tweets = data.statuses;
			// let randomTweet = chooseRandom(tweets).text;

			tweets.forEach((tweet) => {
				tweetList.push(tweet.text);
			});

			const tweetDump = tweetList.join('. ');

			console.log('Chose random tweet: ');
			// console.log(randomTweet);

			let tweetNLP = nlp(tweetDump);
			let newTweetNLP = nlp(summarizer(tweetDump));

			let people 			= tweetNLP.people().sort('freq').unique();
			let places 			= tweetNLP.places().sort('freq').unique();
			let statements 		= tweetNLP.statements().sort('freq').unique();
			let questions 		= tweetNLP.questions().sort('freq').unique();
			let organizations 	= tweetNLP.organizations().sort('freq').unique();
			let values 			= tweetNLP.values().sort('freq').unique();

			let wordBag = {};

			people.normalize();
			places.normalize();
			statements.normalize();
			questions.normalize();
			organizations.normalize();
			values.normalize();

			wordBag.people = people.terms().data();
			wordBag.places = places.terms().data();
			wordBag.statements = statements.data();
			wordBag.questions = questions.data();
			wordBag.organizations = organizations.terms().data();
			wordBag.values = values.terms().data();

			fs.writeFile('./data.json', JSON.stringify(wordBag), (err) => {
				if (err) throw err;
				console.log('tweets saved');
			});

			finalTweet = manufactureTweet(newTweetNLP, wordBag, sentiment(tweetDump));
			console.log('Tweet constructed:');
			console.log(finalTweet);

			giphy.trending({limit: 100}, function(err, res) {
				let matchingTrends = res.data.filter((el) => {
					return el.url.includes(trend_param.q);
				});

				if(matchingTrends.length == 0){
					matchingTrends = res.data;
				}

				let image = chooseRandom(matchingTrends);
				let imageUrl = '';
				if(image)
				{
					imageUrl = image.url;
				}

				const tweet_params = {
					status: finalTweet + ' ' + imageUrl
				};

				Twitter.post('statuses/update', tweet_params, (error, data, response) => {
					if(!error){
						console.log('---> Successfully tweeted.');
					}else{
						console.log('  + Unable to post tweets...');
						console.log(error);
						console.log(response);
					}	
				});
			});

		}else{
			console.log('  + Unable to find tweets from trend...');
			console.log(error);
		}
	});
};

const composeTweet = () => {
	console.log('---> Composing tweet');

	const params = {
        id: 23424916 			// REQUIRED
    };

    let topTrends;

	Twitter.get('trends/place', params, (error, data, response) => {
		console.log('  - Getting trends for place.');

		if(!error){
			const trends = data[0].trends;

			topTrends = trends.sort((a, b)=>{
				return b.tweet_volume - a.tweet_volume;
			});

			let randomTrend = chooseRandom(topTrends.slice(0,10));
			console.log('Trend selected: ' + randomTrend.name);

			const trend_param = {
				q: randomTrend.query,
				lang: 'en',
				count: 100
			};

			searchForTweets(trend_param);
		}else{
			console.log('  + Unable to get trends for tweet...');
			console.log(error);
			console.log(response);
		}
	});
};

// fs.readFile('./data.json', 'utf8', (err, data) => {
// 	if (err) throw err;

// 	lastUpdated = Date.now();

// 	let wordBag = JSON.parse(data);
// 	// console.log(wordBag);
// 	console.log("Hiii guys, Good morning, Have a nice day");
// 	let tweet = manufactureTweet(nlp("Hiii guys, Good morning, Have a nice day James"), wordBag);

// 	console.log(tweet);
// });

composeTweet();

setInterval(()=> {
	composeTweet();
}, 1000 * 60 * 7)
