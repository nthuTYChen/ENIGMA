import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

import '../../template/challenger/explore.html';
import '../../template/challenger/menus.html';
import './menus.js';

let itemsRange = new ReactiveVar(null);
let interfaceL = new ReactiveVar(null), chaTexts = new ReactiveVar(null);
let userData = new ReactiveVar(null);

Tracker.autorun(()=>{
	chaTexts.set(translationDB.findOne({docType: 'challenger'}));
	interfaceL.set(translationDB.findOne({docType: 'general'}));
	userData.set(Meteor.user());
});

Template.explore.onRendered(()=>{
	Session.set('browseSession', 'exploreChallenge');
	itemsRange.set({
		recommended: {
			onset: 0,
			offset: 10
		},
		participated: {
			onset: 0,
			offset: 10
		},
		otherLang: {
			onset: 0,
			offset: 10
		}
	});
	userData.set(Meteor.user());
});

Template.explore.helpers({
	chaTranslation (col) {
		return chaTexts.get() && chaTexts.get()[col];
	},
	genTranslation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	// Need to change this setting with users' own icon set and network settings
	iconURL () {
		return domainURL + 'yourFolder/icons/';
	},
	notPassedTimeGap (gap) {
		let lastParticipation = userData.get() && userData.get().profile.exp.lastParticipation;
		if(lastParticipation && gap) {
			if(lastParticipation.getTime() + gap * 3600 * 1000 > (new Date()).getTime()) {
				return true;
			}
		}
		return false;
	},
	othersColors () {
		let colors = ['rgba(214, 119, 120)', 'rgba(221, 141, 143)', 'rgba(229, 163, 165)', 'rgba(236, 185, 188)', 'rgba(244, 207, 210)', 'rgba(251, 229, 233)', 'rgba(248, 232, 238)'];
		let randomIndex = Math.floor(Math.random() * colors.length);
		return colors[randomIndex];
	},
	othersExp () {
		let onset = itemsRange.get() && itemsRange.get().otherLang.onset, offset = itemsRange.get() && itemsRange.get().otherLang.offset;
		if(onset !== null) {
			return experimentDB.find({$and: [{_id: {$nin: userData && userData.get().profile.exp.participated}}, 
				{availableLang: {$nin: [userData.get() && userData.get().profile.userLang, userData.get() && userData.get().profile.L1, userData.get() && userData.get().profile.L2]}}]}, {limit: offset, skip: onset});
		}
		return;
	},
	participatedColors () {
		let colors = ['rgba(237, 242, 251)', 'rgba(226, 234, 252)', 'rgba(215, 227, 252)', 'rgba(204, 219, 253)', 'rgba(193, 211, 254)', 'rgba(182, 204, 254)', 'rgba(171, 196, 255)'];
		let randomIndex = Math.floor(Math.random() * colors.length);
		return colors[randomIndex];
	},
	participatedExps () {
		let onset = itemsRange.get() && itemsRange.get().participated.onset, offset = itemsRange.get() && itemsRange.get().participated.offset;
		if(onset !== null) {
			return experimentDB.find({_id: {$in: userData.get() && userData.get().profile.exp.participated}}, {limit: offset, skip: onset});
		}
		return;
	},
	recommendedColors () {
		let colors = ['rgba(255, 218, 61)', 'rgba(255, 213, 62)', 'rgba(254, 207, 62)', 'rgba(253, 196, 63)', 'rgba(253, 190, 57)', 'rgba(253, 184, 51)', 'rgba(255, 233, 78)'];
		let randomIndex = Math.floor(Math.random() * colors.length);
		return colors[randomIndex];
	},
	recommendedExps () {
		let onset = itemsRange.get() && itemsRange.get().recommended.onset, offset = itemsRange.get() && itemsRange.get().recommended.offset;
		if(onset !== null) {
			return experimentDB.find({$and: [{_id: {$nin: userData.get().profile.exp.participated}}, 
				{availableLang: {$in: [userData.get() && userData.get().profile.userLang, userData.get() && userData.get().profile.L1, userData.get() && userData.get().profile.L2]}}]}, 
				{limit: offset, skip: onset, sort: {'status.currentSubj': 1}});
		}
		return;
	},
	recruiting (status) {
		if(status === 'complete') {
			return chaTexts.get() && chaTexts.get()['no'];
		}
		return chaTexts.get() && chaTexts.get()['yes'];
	},
	timeGapCalc (gap) {
		if(userData.get() && userData.get().profile.exp.lastParticipation) {
			let lastParticipation = userData.get().profile.exp.lastParticipation;
			let remainingTime = lastParticipation.getTime() + gap * 3600 * 1000 - (new Date()).getTime();
			let hours = Math.floor(remainingTime / (3600 * 1000));
			let mins = Math.floor(((remainingTime - (hours * 3600 * 1000))) / (60 * 1000));
			return hours + chaTexts.get()['hours'] + ' ' + mins + chaTexts.get()['minutes'];
		}
		return;
	}
});

Template.explore.events({
	'touchend #exploreHelp, click #exploreHelp' (event) {
		if(Tools.swipeCheck(event)) {
			let target = event.currentTarget.id.replace('Help', '');
			Tools.getAndShowInstruction(target);
		}
	},
	'touchend #closeInstruction, click #closeInstruction' (event) {
		if(Tools.swipeCheck(event)) {
			Tools.closeInstruction();
		}
	},
	'touchend #submitExpId, click #submitExpId' (event) {
		if(Tools.swipeCheck(event)) {
			let expId = $('#expId').val().trim();
			let exp = experimentDB.findOne({_id: expId});
			if(exp) {
				let gap = exp.basicInfo.gapHour;
				let lastParticipation = Meteor.user().profile.exp.lastParticipation;
				if(lastParticipation && lastParticipation.getTime() + gap * 3600000 > (new Date()).getTime()) {
					Styling.showWarning('challengetimegape', 'challenger');
				}
				else {
					runFormalExp(expId);
				}
			}
			else {
				Styling.showWarning('challengenotfounde', 'challenger');
			}
		}
	},
	'touchend #cancelSubmitExpId, click #cancelSubmitExpId' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			$('fieldset:first-of-type > legend ~ p > span').slideUp(300, ()=>{
				$('fieldset:first-of-type > legend ~ p > input').slideDown(300);
				$('fieldset:first-of-type > legend').siblings().slideDown(500);
				$('#expId').val('');
			});
		}
	},
	'touchend #enterExpId, click #enterExpId' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			$('fieldset:first-of-type > legend ~ p > input').slideUp(300);
			$('fieldset:first-of-type > legend').siblings().slideUp(300, ()=>{
				$('fieldset:first-of-type > legend ~ p > span').slideDown(300, ()=>{
					$('fieldset:first-of-type > legend ~ p').slideDown(500);
				});
			});;
		}
	},
	'touchend .switchOnOffset, click .switchOnOffset' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			let id = event.currentTarget.id;
			let actionTarget = id.replace(/prev|next/ig, '');
			if(id.indexOf('Prev') > -1) {
				if(itemsRange.get()[actionTarget].onset - 10 >= 0) {
					let newItemsRange = itemsRange.get();
					newItemsRange[actionTarget].onset = newItemsRange[actionTarget].onset - 10;
					newItemsRange[actionTarget].offset = newItemsRange[actionTarget].offset - 10;
					itemsRange.set(newItemsRange);
				}
				else {
					Styling.showWarning('nolessrecord', 'challenger');
				}
			}
			else {
				let allExpsN = 0;
				if(actionTarget === 'recommended' && userData) {
					allExpsN = experimentDB.find({$and: [{'status.state': 'active'}, {availableLang: userData.get() && userData.get().profile.userLang}]}).fetch().length;
				}
				else if(actionTarget === 'participated' && userData) {
					allExpsN = experimentDB.find({_id: {$in: userData.get() && userData.get().profile.exp.participated}}).fetch().length;
				}
				else if(userData) {
					allExpsN = 	experimentDB.find({availableLang: {$ne: userData.get() && userData.get().profile.userLang}}).fetch().length;
				}
				if(itemsRange.get()[actionTarget].offset + 10 <= allExpsN) {
					let newItemsRange = itemsRange.get();
					newItemsRange[actionTarget].onset = newItemsRange[actionTarget].onset + 10;
					newItemsRange[actionTarget].offset = newItemsRange[actionTarget].offset + 10;
					itemsRange.set(newItemsRange);
				}
				else {
					Styling.showWarning('nomorerecord', 'challenger');
				}
			}
		}
	},
	'touchend input[id^=run], click input[id^=run]' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			let expId = event.currentTarget.id.replace('run_', '');
			runFormalExp(expId);
		}
	}
});

function runFormalExp (expId) {
	Session.set('expType', 'formal');
	Session.set('expId', expId);
	Tools.runExp();
};