import Styling from '../styling/stylingFuncs.js';

import '../../template/challenger/wmHistory.html';
import '../../template/challenger/menus.html';
import './menus.js';

let chaTranslation = new ReactiveVar(null);
let lastTest = new ReactiveVar(null), wmSiteStats = new ReactiveVar(null), wmFullMarks = 210;

Template.wmHistory.onRendered(()=>{
	Session.set('browseSession', 'wmHistory');
	let delay = 500;
	$('section > div').each((index)=>{
		$('section > div').eq(index).delay(delay * index).animate({opacity: 1}, 300);
	});
	Tracker.autorun(()=>{
		let allStats = wmStatsDB.find().fetch();
		if(allStats.length > 0) {
			lastTest.set(allStats[0]);
			let delay = 500;
			$('section > div:first-of-type > div:not(:first-of-type').each((index)=>{
				let score = allStats[index].totalScore;
				let perc = Math.round(score * 1000 / wmFullMarks) / 10;
				$('section > div:first-of-type > div:not(:first-of-type').eq(index).delay(delay * index).animate({width: perc + '%'}, 500);
			});
		}
	});
	Tracker.autorun(()=>{
		chaTranslation.set(translationDB.findOne({docType: 'challenger'}));
	});
	Tracker.autorun(()=>{
		let stats = siteStatsDB.findOne({docType: 'wmStats'});
		if(stats) {
			wmSiteStats.set(stats);
			let ageMeans = stats.ageGroupMean;
			for(let i=0 ; i<ageMeans.length ; i++) {
				let perc = Math.round(ageMeans[i] * 1000 / wmFullMarks) / 10;
				$('section > div:last-of-type > div:not(:first-of-type').eq(i).delay(delay * i).animate({width: perc + '%'}, 500);
			}
		}
	});
});

Template.wmHistory.helpers({
	ageMeanColor (low, high) {
		let userData = Meteor.user();
		if(userData) {
			let dob = new Date(userData.profile.dob), currentTime = new Date();
			let age = currentTime.getFullYear() - dob.getFullYear();
			if(dob.getMonth() + 1 >= currentTime.getMonth() + 1) {
				age = currentTime.getFullYear() - dob.getFullYear() - 1;
			}
			if(age >= low && age <= high) {
				return 'userGroup';
			}
		}
		return;
	},
	chaTranslation (field) {
		let texts = chaTranslation.get();
		return texts && texts[field];
	},
	// Need to change this setting with users' own icon set and network settings
	iconURL () {
		return domainURL + 'yourFolder/icons/';
	},
	lastTest (field) {
		let test = lastTest.get();
		if(test) {
			if(field === 'duration') {
				let duration = test[field];
				return Math.round(duration * 10 / (60 * 1000)) / 10;
			}
			return test[field];
		}
		return;
	},
	recordScore () {
		let user = Meteor.user();
		return user && user.profile.wm.record;
	},
	testDate (date) {
		return dateFormatting(date);
	},
	timeGapPassed () {
		if(lastTest.get() && calcGap() > 30) {
			return true;
		}
		return false;
	},
	untilNextTest () {
		if(lastTest.get()) {
			return calcGap();
		}
		return;
	},
	wmSiteLastUpdate () {
		let stats = wmSiteStats.get();
		if(stats) {
			let lastUpdate = stats.lastUpdate;
			return dateFormatting(lastUpdate);
		}
		return;
	},
	wmSiteAgeMeans (index) {
		let stats = wmSiteStats.get();
		return stats && stats.ageGroupMean[index];
	},
	wmSiteSessionN () {
		let stats = wmSiteStats.get();
		return stats && stats.totalWMSessions;
	},
	wmTests () {
		return wmStatsDB.find();
	}
});

function calcGap () {
	let currentTime = new Date();
	let lastTime = lastTest.get().endTime;
	let gap = Math.round((lastTime.getTime() + 30 * 24 * 3600 * 1000 - currentTime.getTime()) * 10 / (24 * 3600 * 1000)) / 10;
	if(gap > 0) {
		return gap;
	}
	return 0;
};

function dateFormatting (date) {
	return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
};