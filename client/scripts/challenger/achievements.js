import Tools from '../lib/commonTools.js';

import '../../template/challenger/achievements.html';
import '../../template/challenger/menus.html';
import './menus.js';

let chaTexts = new ReactiveVar(null);

Tracker.autorun(()=>{
	chaTexts.set(translationDB.findOne({docType: 'challenger'}));
});

Template.achievements.onRendered(()=>{
	if(Meteor.user() && Meteor.user().profile.gaming.newAchieve > 0) {
		Meteor.call('funcEntryWindow', 'user', 'clearNewAchievements', '');
	}
	Session.set('browseSession', 'achievements');
	Tracker.afterFlush(()=>{
		let achievementsN = Meteor.user() && Meteor.user().profile.gaming.achievements.length;
		for(let i=0 ; i<achievementsN ; i++) {
			$('section > div.hiddenGems').eq(0).remove();
		}
		$('section > div').each((index)=>{
			$('section > div').eq(index).delay(index * 200).animate({'opacity': 1}, 300);
		});
	});
});

Template.achievements.helpers({
	achievementsN () {
		return Meteor.user() && Meteor.user().profile.gaming.achievements.length;
	},
	chaTranslation (col) {
		return chaTexts.get() && chaTexts.get()[col];
	},
	getDate (origDate) {
		let newDate = timeCalibrater(origDate);
		return newDate.getFullYear() + '-' + (newDate.getMonth() + 1) + '-' + newDate.getUTCDate();
	},
	hiddenAchievements () {
		let hiddenN = 30;
		if(hiddenN) {
			let hiddenGems = new Array(hiddenN);
			for(let i=0 ; i<hiddenGems.length ; i++) {
				hiddenGems[i] = '';
			}
			return hiddenGems;
		}
		return;
	},
	iconNote (type) {
		let target = type + 'note';
		return chaTexts.get() && chaTexts.get()[target];
	},
	// Need to change this setting with users' own icon set and network settings
	iconURL () {
		return domainURL + 'yourFolder/icons/';
	},
	obtainedAchievements () {
		return Meteor.user() && Meteor.user().profile.gaming.achievements;
	}
});

Template.achievements.events({
	'touchend h3 > img, click h3 > img' (event) {
		if(Tools.swipeCheck(event)) {
			let note = event.target.title;
			alert(note);
		}
	}
});

function timeCalibrater (time) {
	return new Date(time.getTime() - (8 * 60 * 60 * 1000) - (time.getTimezoneOffset() * 60 * 1000));
};