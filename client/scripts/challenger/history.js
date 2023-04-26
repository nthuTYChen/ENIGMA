import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

import '../../template/challenger/history.html';
import '../../template/challenger/menus.html';
import './menus.js';

let statsRange = new ReactiveVar(null);
let chaTexts = new ReactiveVar(null);
let deleteTarget = '';

Tracker.autorun(()=>{
	chaTexts.set(translationDB.findOne({docType: 'challenger'}));
	$('section > div').each((index)=>{
		$('section > div').eq(index).delay(index * 200).animate({'opacity': 1}, 300);
	});
});

Template.history.onRendered(()=>{
	Session.set('browseSession', 'challengeHistory');
	statsRange.set({
		onset: 0,
		offset: 10
	});
	$('section > div').each((index)=>{
		$('section > div').eq(index).delay(index * 200).animate({'opacity': 1}, 300);
	});
	deleteTarget = '';
});

Template.history.helpers({
	anyStats () {
		if(expStatsDB.find().fetch().length > 0) {
			return true;
		}
		return false;
	},
	chaTranslation (col) {
		return chaTexts.get() && chaTexts.get()[col];
	},
	challenging (expId) {
		let runExpRecord = Meteor.user() && Meteor.user().runExpRecord;
		if(runExpRecord && runExpRecord.challenging && expId === runExpRecord.expId) {
			return true;
		}
		return false;
	},
	historyColor (lowAcc, noResp, fastComplete) {
		if(lowAcc === true || noResp === true || fastComplete === true) {
			return '251, 97, 7';
		}
		return '124, 181, 24';
	},
	// Need to change this setting with users' own icon set and network settings
	iconURL () {
		return domainURL + 'yourFolder/icons/';
	},
	respsStats () {
		let range = statsRange.get();
		if(range) {
			return expStatsDB.find({}, {sort: {date: -1}, limit: range.offset, skip: range.onset});
		}
		return;
	},
	respsStatsLen () {
		return expStatsDB.find({}).fetch().length;
	},
	statsDate (origDate) {
		let correctedTime = timeCalibrater(origDate);
		return correctedTime.getFullYear() + '-' + (correctedTime.getMonth() + 1) + '-' + correctedTime.getUTCDate();
	}
});

Template.history.events({
	'touchend #historyHelp, click #historyHelp' (event) {
		if(Tools.swipeCheck(event, true, true)) {
			let target = event.currentTarget.id.replace('Help', '');
			Tools.getAndShowInstruction(target);
		}
	},
	'touchend #closeInstruction, click #closeInstruction' (event) {
		if(Tools.swipeCheck(event, true, true)) {
			Tools.closeInstruction();
		}
	},
	'touchend #historyPrev, click #historyPrev' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			if(statsRange.get().onset - 10 >= 0) {
				let newStatsRange = statsRange.get();
				newStatsRange.onset = newStatsRange.onset - 10;
				newStatsRange.offset = newStatsRange.offset - (newStatsRange.offset % 10 === 0 ? 10 : newStatsRange.offset % 10);
				statsRange.set(newStatsRange);
			}
			else {
				Styling.showWarning('nolessrecord', 'challenger');
			}
		}
	},
	'touchend #historyNext, click #historyNext' (event) {
		if(Tools.swipeCheck(event, true, true)) {
			let allHistoryN = expStatsDB.find({}).fetch().length;
			if(statsRange.get().offset + 10 <= allHistoryN) {
				let newStatsRange = statsRange.get();
				newStatsRange.onset = newStatsRange.onset + 10;
				newStatsRange.offset = newStatsRange.offset + 10;
				statsRange.set(newStatsRange);
			}
			else if(statsRange.get().offset < allHistoryN) {
				let newStatsRange = statsRange.get();
				newStatsRange.onset = newStatsRange.onset + 10;
				newStatsRange.offset = newStatsRange.offset + (allHistoryN - newStatsRange.offset);
				statsRange.set(newStatsRange);
			}
			else {
				Styling.showWarning('nomorerecord', 'challenger');
			}
		}
	},
	'touchend input[id^="statsCheck_"], click input[id^="statsCheck_"]' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			let targetId = event.currentTarget.id.replace('statsCheck_', '');
			let result = expStatsDB.findOne({_id: targetId});
			FlowRouter.go('expResults', {lang: Session.get('userLang'), results: targetId, session: result.sessionN});
		}
	},
	'touchend input[id^="statsRemove_"], click input[id^="statsRemove_"]' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			deleteTarget = event.currentTarget.id.replace('statsRemove_', '');
			$('div#removeHistConfirm').css('display', 'block');
		}
	},
	'touchend input#confirmRemove, click input#confirmRemove' () {
		Styling.showWarning('removing', 'challenger');
		$('div#removeHistConfirm').css('display', 'none');
		Meteor.call('funcEntryWindow', 'user', 'removeExpStats', {targetId: deleteTarget}, (err, res)=>{
			if(err) {
				Tools.callErrorHandler(err, 'server');
			}
			else {
				Styling.showWarning('expresultsremoved', 'challenger');
			}
		});
		deleteTarget = '';
	},
	'touchend input#cancelRemove, click input#cancelRemove' () {
		deleteTarget = '';
		$('div#removeHistConfirm').css('display', 'none');
	},
	'touchend input[id^="getConsent_"], click input[id^="getConsent_"]' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			let targetId = event.currentTarget.id.replace('getConsent_', '');
			Styling.showWarning('retrieving', 'challenger');
			Meteor.call('funcEntryWindow', 'user', 'getConsent', {targetId: targetId}, (err, res)=>{
				if(err) {
					Tools.callErrorHandler(err, 'server');
				}
				else {
					let windowRef = window.open();
					let dir = 'Files/';
					if(urlRootPath === 'ENIGMA/') {
						dir = 'enigma' + dir;
					}
					else {
						dir = 'enigmaDemo' + dir;
					}
					windowRef.location = domainURL + dir + res.msg;
				}
			});
		}
	}
});

function timeCalibrater (time) {
	return new Date(time.getTime() - (8 * 60 * 60 * 1000) - (time.getTimezoneOffset() * 60 * 1000));
};