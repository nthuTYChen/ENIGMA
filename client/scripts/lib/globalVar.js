import { Mongo } from 'meteor/mongo';

allLangList = new Mongo.Collection('allLangList');
experimentDB = new Mongo.Collection('experimentDB');
expResultsDB = new Mongo.Collection('expResultsDB');
expStatsDB = new Mongo.Collection('expStatsDB');
wmStatsDB = new Mongo.Collection('wmStatsDB');
siteStatsDB = new Mongo.Collection('siteStatsDB');
activityLogDB = new Mongo.Collection('activityLogDB');
translationDB = new Mongo.Collection('translationDB');
languageFactsDB = new Mongo.Collection('languageFactsDB');

langList = {'en-us': [{code: 'en-us', name: 'English (United States)'}, {code: 'zh-tw', name: 'Traditional Chinese (Taiwan)'}, 
	{code: 'ja', name: 'Japanese'}, {code: 'es', name: 'Spanish'}, {code: 'de', name: 'German'}, {code: 'fr', name: 'French'}],
			'zh-tw': [{code: 'en-us', name: '英文(美國)'}, {code: 'zh-tw', name: '正體中文(台灣)'}, {code: 'ja', name: '日語'}, {code: 'es', name: '西班牙語'}, {code: 'de', name: '德語'}, {code: 'fr', name: '法語'}]
	};

// The settings below have to be modifited to accomodate users' own network settings.
urlRootPath = 'ENIGMA/', domainURL = 'https://your.server.dns/';