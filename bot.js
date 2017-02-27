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

const Twitter = new twit(config);

const happyEmoji = ['😆', '😀', '😃', '😄', '😁', '😊'];
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

const manufactureTweet = (tweetNLP, wordBag) => {
	let newTweet = [];
	tweetNLP.out('terms').forEach((word) => {
		let newWord = word;

		if(isPerson(newWord)){
			let names = chooseRandom(wordBag.people);
			let name = names;

			if(isFirstName(newWord) && newWord.firstName.length > 1){
				name = newWord.firstName;
			}

			if(isLastName(newWord) && newWord.lastName.length > 1){
				name = newWord.lastName;
			}

			newWord = name.normal.charAt(0).toUpperCase() + name.normal.slice(1);
		}else if(isUrl(newWord) || newWord.text.includes('@') || newWord.text.includes('RT')){
			newWord = '';
		}else if(isAdverb(newWord)){
			let data = fs.readFileSync('./adverbs.json', 'utf8');

			const adverbs = JSON.parse(data);
			newWord = chooseRandom(adverbs);
		}
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

	if(sentiment(sentence).score > 0){
		indicator = chooseRandom(happyEmoji);
	}else{
		tindicator = chooseRandom(sadEmoji);
	}

	return tweet.out('text') + indicator;
};

const searchForTweets = (trend_param) => {
	const tweetList = [];
	Twitter.get('search/tweets', trend_param, (error, data, response) =>{
		if(!error){
			const tweets = data.statuses;
			let randomTweet = chooseRandom(tweets).text;

			tweets.forEach((tweet) => {
				tweetList.push(tweet.text);
			});

			const tweetDump = tweetList.join('. ');

			console.log('Chose random tweet: ');
			console.log(randomTweet);

			let tweetNLP = nlp(tweetDump);
			let newTweetNLP = nlp(randomTweet);

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

			finalTweet = manufactureTweet(newTweetNLP, wordBag);

			console.log(finalTweet);

		}else{
			console.log('  + Unable to find tweets from trend...');
			console.log(error);
		}
	});
};

const composeTweet = () => {
	console.log('---> Composing tweet');

	const params = {
        id: '1', 			// REQUIRED
        exclude: 'recent' 	// Optional
    };

    let topTrends;

	Twitter.get('trends/place', params, (error, data, response) => {
		console.log('  - Getting trends for place.');

		if(!error){
			const trends = data[0].trends;

			topTrends = trends.sort((a, b)=>{
				return b.tweet_volume - a.tweet_volume;
			});

			const randomTrend = chooseRandom(topTrends.slice(0,5));
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
// 	console.log("RT @mfaa_pex: English proverbs success is getting what you want Happiness is wanting what you get #رحله_شاهي_السعد1 #حياتك16");
// 	let tweet = manufactureTweet(nlp("RT @mfaa_pex: English proverbs success is getting what you want Happiness is wanting what you get #رحله_شاهي_السعد1 #حياتك16"), wordBag);

// 	console.log(tweet);
// });

composeTweet();

setInterval(()=> {
	composeTweet();
}, 1000 * 60 * 15)

