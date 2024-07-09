import { Accounts } from 'meteor/accounts-base';
import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { fetch } from 'meteor/fetch';

var emailFormat = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var deleteThreshold = 3*3600*1000*24;

//---------------Regular Check Functions----------------
var cleanUnverifiedUsers = ()=>{
	let currentTime = new Date();
	Meteor.users.find({'emails.0.verified': false, 'profile.verifyDue': {$lte: currentTime}}).forEach((user)=>{
		let oldUserRecord = {
			username: user.username,
			participated: user.profile.exp.participated,
			sideNotes: user.profile.exp.sideNotes,
			date: new Date()
		};
		deletedUserRepo.insert(oldUserRecord);
		Meteor.users.remove({_id: user._id});
	});
	adminLogDB.insert({
		type: 'system',
		function: 'cleanUnverifiedUsers',
		user: 'server',
		exp: '',
		note: 'clean unverified users',
		ipAddress: 'server',
		date: new Date()
	});	
};

Meteor.startup(()=>{
	//Remove unverified users regularly
	Meteor.setInterval(cleanUnverifiedUsers, 3600 * 1000);
});

//---------------User Config----------------------------

Accounts.config({
	sendVerificationEmail: true,
	loginExpirationInDays: 7,
	passwordResetTokenExpirationInDays: 1
});

Accounts.emailTemplates.siteName = 'ENIGMA';
Accounts.emailTemplates.from = 'ENIGMA Admin <enigma@lngproc.hss.nthu.edu.tw>';

Accounts.emailTemplates.verifyEmail.subject = (user) => {
	if(user.profile.userLang === 'zh-tw') {
		return '歡迎來到「字謎」！';
	}
	else {
		return 'Welcome to "ENIGMA"!';
	}
};

Accounts.emailTemplates.resetPassword.subject = (user) => {
	if(user.profile.userLang === 'zh-tw') {
		return '重設您的「字謎」密碼';
	}
	else {
		return 'Reset your password in ENIGMA';
	}
};

Accounts.emailTemplates.verifyEmail.text = (user, url) => {
	let regTemplate = Assets.getText('emails/registration_'+user.profile.userLang+'.txt');
	url = url.replace('http', 'https');
	url = url.replace('#/verify-email', 'verify/'+user.profile.userLang);
	regTemplate = regTemplate.replace('[url]', url);
	return regTemplate;
};

Accounts.emailTemplates.resetPassword.text = (user, url) => {
	let regTemplate = Assets.getText('emails/forgetPW_'+user.profile.userLang+'.txt');
	url = url.replace('http', 'https');
	url = url.replace('#/reset-password', 'resetPW/'+user.profile.userLang+'/'+user.profile.userCat);
	regTemplate = regTemplate.replace('[url]', url);
	return regTemplate;
};

Accounts.validateNewUser((user)=>{
	let errMsg = [];
	let dateFormat = /^\d{4}-\d{1,2}-\d{1,2}$|^\d{1,2}-\d{1,2}-\d{4}$/ig;
	if(!emailFormat.test(user.username)) {
		errMsg.push('emailformate');
	}
	else if((emailFormat.length > 100 || user.username !== user.emails[0].address) ||
		!/^(challenger|experimenter)$/ig.test(user.profile.userCat) ||
		!/^(zh-tw|en-us)$/ig.test(user.profile.userLang) ||
		user.profile.rememberMe !== false) {
		errMsg.push('vitale');
	}
	else if(user.profile.userCat === 'challenger' && 
		(!/^(male|female|nonbinary|donotdisclose)$/ig.test(user.profile.gender) || 
			!/^(left|right|both)$/ig.test(user.profile.handedness) ||
			!dateFormat.test(user.profile.dob))) {
		errMsg.push('vitale');
	}
	else if(!allLangList.findOne({code: user.profile.L1}) || 
		(user.profile.L2 !== 'na' && !allLangList.findOne({code: user.profile.L2}))) {
		errMsg.push('vitale');
	}
	if(errMsg.length > 0) {
		throw new Meteor.Error(555, errMsg[0]);
	}
	else {
		return true;
	}
});

Accounts.onCreateUser((options, user)=>{
	try {
		options.profile.L1 = options.profile.L1.substr(0, 10);
		options.profile.L2 = options.profile.L2.substr(0, 10);
	}
	catch(err) {
		throw Meteor.Error(errMsg);
	}
	let customProfile = {}, currentTime = new Date();
	if(options.profile.userCat === 'challenger') {
		customProfile = {
			userCat: options.profile.userCat,
			L1: options.profile.L1,
			L2: options.profile.L2,
			userLang: options.profile.userLang,
			dob: options.profile.dob,
			exp: {
				lastParticipation: null,
				participated: [],
				sideNotes: {
					daydreamer: {
						recorded: false,
						date: null
					},
					fastCompletion: {
						recorded: false,
						date: null
					},
					frequentQuitter: {
						recorded: false,
						counts: 0,
						date: null
					},
					hacking: {
						recorded: false,
						counts: 0,
						date: null
					}
				}
			},
			gaming: {
				session: {
					nums: 0,
					ranking: null,
				},
				oldSession: {
					nums: 0
				},
				repeatedSession: {
					nums: 0
				},
				correctRespN: {
					nums: 0,
					ranking: null
				},
				allCorrRTMean: {
					nums: null,
					records: [],
					ranking: null
				},
				achievements: [],
				newAchieve: 0
			},
			wm: {
				record: 0,
				age: null
			},
			gender: options.profile.gender,
			handedness: options.profile.handedness,
			rememberMe: options.profile.rememberMe,
			subscribe: true,
			loginAttemptIP: {
				lastLogin: '',
				currentLogin: ''
			},
			verifyDue: new Date(currentTime.getTime() + deleteThreshold)
		};
		let oldUserRecord = deletedUserRepo.findOne({username: options.username});
		if(oldUserRecord) {
			customProfile.exp.participated = oldUserRecord.participated;
			customProfile.exp.sideNotes = oldUserRecord.sideNotes;
			deletedUserRepo.remove({username: options.username});
		}
	}
	else {
		customProfile = {
			userCat: options.profile.userCat,
			userLang: options.profile.userLang,
			exp: {runningExp: 0, allExp: 0, runningExpQuota: 10, allExpQuota: 30},
			rememberMe: options.profile.rememberMe,
			loginAttemptIP: {
				lastLogin: '',
				lastLoginTime: null,
				currentLogin: '',
				currentLoginTime: null
			},
			verifyDue: new Date(currentTime.getTime() + deleteThreshold)
		};
	}
	user.profile = customProfile;
	return user;
});

Accounts.validateLoginAttempt((attempt)=>{
	//Block new users from being logged in automatically
	if(attempt.methodName === 'createUser' || !attempt.user) {
		return false;
	}
	if(!attempt.allowed) {
		recordAdminLog('warning', 'validateLoginAttempt', attempt.connection.clientAddress, '', 'login failed: ' + attempt.user._id, 'server');
		return false;
	}
	let userData = Meteor.users.findOne({_id: attempt.user._id});
	let lastLoginIP = userData && userData.profile.loginAttemptIP.currentLogin;
	let lastLoginTime = userData && userData.profile.loginAttemptIP.currentLoginTime;
	Meteor.users.update({_id: attempt.user._id}, {$set: 
		{'profile.loginAttemptIP.lastLogin': lastLoginIP,
		'profile.loginAttemptIP.lastLoginTime': lastLoginTime,
		'profile.loginAttemptIP.currentLogin': attempt.connection.clientAddress,
		'profile.loginAttemptIP.currentLoginTime': new Date()
	}});
	recordAdminLog('normal', 'validateLoginAttempt', attempt.connection.clientAddress, '', 'login successful: ' + userData.username, 'server');
	return true;
});

//--------------Functions called from the entry 'window'----------------
export let getAbout = (data)=>{
	let errMsg = [];
	if(data.userCat === '') {
		data.userCat = 'challenger';
	}
	let aboutFilename = 'about_'+data.userCat+'_'+data.userLang+'.txt';
	try {
		let aboutDoc = Assets.getText('about/'+aboutFilename);
		let user = (Meteor.user() && Meteor.user().username) || 'guest';
		recordAdminLog('normal', 'getAbout', data.clientIP, '', 'get about file ' + aboutFilename, user);
		return {type: 'ok', about: aboutDoc};
	}
	catch(err) {
		errMsg.push('vitale');
		recordAdminLog('warning', 'getAbout', data.clientIP, '', 'failed to get about file ' + aboutFilename, user);
		return errMsg;
	}
};

export let getUserAgreement = (data)=>{
	let errMsg = [];
	let userAgreeFilename = 'userAgreement_'+data.userCat+'_'+data.userLang+'.txt';
	try {
		let userAgreement = Assets.getText('userAgreement/'+userAgreeFilename);
		recordAdminLog('normal', 'getUserAgreement', data.clientIP, '', 'get user agreement ' + userAgreeFilename, Meteor.user() && Meteor.user().username);
		return {type: 'ok', agreement: userAgreement};
	}
	catch(err) {
		errMsg.push('vitale');
		recordAdminLog('warning', 'getUserAgreement', data.clientIP, '', 'failed to get user agreement ' + userAgreeFilename, Meteor.user() && Meteor.user().username);
		return errMsg;
	}
};

export let resendUserEmail = (data)=>{
	let errMsg = [], userId = null, verified = false;;
	try {
		if(!emailFormat.test(data.email)) {
			recordAdminLog('warning', 'resendUserEmail', data.clientIP, '', 'email format', Meteor.user() && Meteor.user().username);
			errMsg.push('emailformate');
		}
		else if(!Meteor.users.findOne({username: data.email})) {
			recordAdminLog('warning', 'resendUserEmail', data.clientIP, '', 'no user', Meteor.user() && Meteor.user().username);
			errMsg.push('emailnotexiste');
		}
		else if(data.email.length > 100) {
			recordAdminLog('warning', 'resendUserEmail', data.clientIP, '', 'email length', Meteor.user() && Meteor.user().username);
			errMsg.push('vitale');
		}
		else {
			let user = Meteor.users.findOne({username: data.email});
			userId = user._id;
			verified = user.emails[0].verified;
		}
		if(verified && data.type === 'resendVerify') {
			errMsg.push('vitale');
		}
	}
	catch(err) {
		recordAdminLog('warning', 'resendUserEmail', data.clientIP, '', 'try and catch issue', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
	}
	if(errMsg.length === 0) {
		if(data.type === 'resendVerify')
		{
			let resendLog = mailLogDB.findOne({type: 'resendVerify', email: data.email}, {sort: {date: -1}});
			if(resendLog && ((new Date()).getTime() - resendLog.date.getTime()) / (300 * 1000) <= 5) {
				return {type: 'error', errMsg: ['shortresend']};
			}
			Meteor.users.update({_id: userId}, {$set: {'services.email.verificationTokens': []}});
			Accounts.sendVerificationEmail(userId, data.email);
			mailLogDB.insert({type: 'resendVerify', email: data.email, date: new Date()});
		}
		else {
			let resendLog = mailLogDB.findOne({type: 'sendResetPassword', email: data.email}, {sort: {date: -1}});
			if(resendLog && ((new Date()).getTime() - resendLog.date.getTime()) / (300 * 1000) <= 5) {
				return {type: 'error', errMsg: ['shortresend']};
			}
			Accounts.sendResetPasswordEmail(userId, data.email);
			mailLogDB.insert({type: 'sendResetPassword', email: data.email, date: new Date()});
		}
		recordAdminLog('normal', 'resendUserEmail', data.clientIP, '', 'resent verify/password email ' + data.email, Meteor.user() && Meteor.user().username);
		return {type: 'ok'};
	}
	else {
		return {type: 'error', errMsg: errMsg};
	}
};

export let appResetPW = (data)=> {
	let results = Meteor.call('resetPassword', data.token, data.password);
	if(results.error) {
		recordAdminLog('warning', 'appResetPW', data.clientIP, '', 'reset pw error', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: results.error};
	}
	else {
		recordAdminLog('normal', 'appResetPW', data.clientIP, '', 'reset pw', Meteor.user() && Meteor.user().username);
		return {type: 'ok'};
	}
};

export let rememberLogin = (data)=>{
	let errMsg = [];
	if(!Meteor.userId() || (data !== false && data !== true)) {
		recordAdminLog('warning', 'rememberLogin', data.clientIP, '', 'critical error', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.rememberMe': data}});
		recordAdminLog('normal', 'rememberLogin', data.clientIP, '', 'remember current login', Meteor.user() && Meteor.user().username);
		return {type: 'ok'};
	}
};

export let changeProfile = (data)=>{
	let errMsg = [], result = {type: 'ok', password: false, username: false};
	let userId = Meteor.userId(), currentUsername = Meteor.user().username;
	if(!Meteor.userId() || !Meteor.users.findOne({_id: userId, username: currentUsername}) ||
		!/^(zh-tw|en-us)$/ig.test(data.userLang)) {
		errMsg.push('vitale');
	}
	else if(!emailFormat.test(data.username)) {
		recordAdminLog('warning', 'changeProfile', data.clientIP, '', 'email format', Meteor.user() && Meteor.user().username);
		errMsg.push('emailformate');
	}
	else if(data.username !== Meteor.user().username && Accounts.findUserByUsername(data.username)) {
		recordAdminLog('warning', 'changeProfile', data.clientIP, '', 'email existed', Meteor.user() && Meteor.user().username);
		errMsg.push('emailexiste');
	}
	else if(data.username !== Meteor.user().username) {
		let resendLog = mailLogDB.findOne({type: 'resendVerify', email: Meteor.user().username}, {sort: {date: -1}});
		if(resendLog && ((new Date()).getTime() - resendLog.date.getTime()) / (300 * 1000) <= 5) {
			errMsg.push('shortresend');
			recordAdminLog('warning', 'changeProfile', data.clientIP, '', 'short resend gap', Meteor.user() && Meteor.user().username);
		}
	}
	if(errMsg.length === 0) {
		Meteor.users.update({_id: userId}, {$set: {'profile.userLang': data.userLang}});
		if(data.password !== '') {
			result.password = true;
			Meteor.setTimeout(()=>{
				Meteor.users.update({_id: userId}, {$set: {'services.resume.loginTokens': []}});
			}, 5000);
			Accounts.setPassword(userId, data.password);
		}
		if(data.username !== currentUsername) {
			result.username = true;
			let currentTime = new Date();
			Accounts.addEmail(userId, data.username);
			Accounts.removeEmail(userId, currentUsername);
			Accounts.setUsername(userId, data.username);
			Meteor.users.update({_id: userId}, {$set: {'services.email.verificationTokens': [],
				'profile.verifyDue': new Date(currentTime.getTime() + deleteThreshold)}});
			Accounts.sendVerificationEmail(userId, data.username);
			mailLogDB.insert({type: 'resendVerify', email: data.username, date: new Date()});
			let subject = 'ENIGMA: Your e-mail has changed.';
			if(data.userLang === 'zh-tw') {
				subject = '字謎：您的帳號電子郵件已變更。';
			}
			let changeEmailNoteBody = Assets.getText('emails/changeEmailNote_'+data.userLang+'.txt');
			changeEmailNoteBody = changeEmailNoteBody.replace('[newEmail]', data.username);
			changeEmailNoteBody = changeEmailNoteBody.replace('[time]', ''+currentTime);
			changeEmailNoteBody = changeEmailNoteBody.replace('[ipAddress]', data.clientIP);
			Email.send({
				to: currentUsername,
				from: 'ENIGMA Admin <enigma@lngproc.hss.nthu.edu.tw>', 
				subject: subject, 
				text: changeEmailNoteBody
			});
			mailLogDB.insert({type: 'changeemailnote', user: currentUsername, date: new Date()});
			if(Meteor.userId()) {
				Meteor.setTimeout(()=>{
					Meteor.users.update({_id: userId}, {$set: {'services.resume.loginTokens': []}});
				}, 5000);
			}
		}
		recordAdminLog('normal', 'changeProfile', data.clientIP, '', 'profile changed', Meteor.user() && Meteor.user().username);
		return result;
	}
	else {
		return {type: 'error', errMsg: errMsg};
	}
};

export let clearNewAchievements = (data)=>{
	if(Meteor.userId() && Meteor.user().emails[0].verified) {
		Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.gaming.newAchieve': 0}});
	}
	recordAdminLog('normal', 'clearNewAchievements', data.clientIP, '', 'clear new achievements', Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let removeExpStats = (data)=> {
	let targetRes = expStatsDB.findOne({_id: data.targetId, userId: Meteor.userId()});
	let userData = Meteor.user(), runExpRecord = Meteor.user() && Meteor.user().runExpRecord;
	if(!Meteor.userId() || !(userData && userData.emails[0].verified) || !targetRes ||
		(runExpRecord && runExpRecord.challenging && runExpRecord.expId === targetRes.expId)) {
		recordAdminLog('warning', 'removeExpStats', data.clientIP, '', 'remove exp stats', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		expStatsDB.remove({_id: data.targetId, userId: targetRes.userId});
		recordAdminLog('normal', 'removeExpStats', data.clientIP, '', 'exp stats removed ' + userData.username, Meteor.user() && Meteor.user().username);
		if(expResultsDB.findOne({expId: targetRes.expId, realUserId: targetRes.userId, verifyCode: targetRes.verifyCode})) {
			if(!Meteor.user().profile.exp.sideNotes.frequentQuitter.recorded) {
				let counts = Meteor.user().profile.exp.sideNotes.frequentQuitter.counts;
				if(counts + 1 === 3) {
					let newSideNotes = {recorded: true, counts: 3, date: new Date()};
					Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.exp.sideNotes.frequentQuitter': newSideNotes}});
				}
				else {
					Meteor.users.update({_id: Meteor.userId()}, {$inc: {'profile.exp.sideNotes.frequentQuitter.counts': 1}});
				}
			}
			expResultsDB.update({expId: targetRes.expId, realUserId: targetRes.userId},
				{$set: {withdrawDate: new Date()}},
					{$unset: 
						{participantId: '', ipAddress: '', verifyCode: '', respsStats: {}, mediaSample: '', profile: {}, startTime: '', endTime: '', condition: '', stimuliList: '', trainingResults: [], testResults: []}
					}
				);
		}
		return {type: 'ok'};
	}
};

export let getConsent = (data) => {
	let targetRes = expStatsDB.findOne({_id: data.targetId, userId: Meteor.userId()});
	let userData = Meteor.user(), runExpRecord = Meteor.user() && Meteor.user().runExpRecord;
	if(!Meteor.userId() || !(userData && userData.emails[0].verified) || !targetRes) {
		recordAdminLog('warning', 'getConsent', data.clientIP, '', 'get consent form', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		// Change this setting according to your network settings and file structure.
		let publicPath = '/URL/to/the/public/files/';
		let now = new Date();
		let date = now.getFullYear() + '' + (now.getMonth() + 1) + '' + now.getDate() + '' + 
    		now.getHours() + '' + now.getMinutes() + '' + now.getSeconds();
    	let zip = new JSZip();
    	zip.file('consentForm.txt', '\uFEFF' + targetRes.consent);
    	zip.file('compensation.txt', '\uFEFF' + targetRes.compensation);
    	zip.saveAs(publicPath + data.targetId + '_' + date + '.zip');
    	recordAdminLog('normal', 'getConsent', data.clientIP, '', 'get consent form by ' + userData.username, Meteor.user() && Meteor.user().username);
		return {type: 'ok', msg: data.targetId + '_' + date + '.zip'};
	}
};

export let deleteUserAccount = (data)=>{
	let userData = Meteor.user();
	if(!userData) {
		recordAdminLog('warning', 'deleteUserAccount', data.clientIP, '', 'no user', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	let checkPWDResult = Accounts._checkPassword(userData, data.password);
	if(checkPWDResult.error && checkPWDResult.error.error === 403) {
		recordAdminLog('warning', 'deleteUserAccount', data.clientIP, '', 'wrong pwd', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['deleteaccounte']};
	}
	else if(checkPWDResult.error) {
		recordAdminLog('warning', 'deleteUserAccount', data.clientIP, '', 'critical error', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	if(userData.profile.userCat === 'experimenter') {
		experimentDB.find({user: userData._id}).forEach((exp)=>{
			expResultsDB.remove({expId: exp._id});
		});
		experimentDB.remove({user: userData._id});
	}
	else {
		wmStatsDB.remove({userId: userData._id});
		expStatsDB.remove({userId: userData._id});
		expResultsDB.update({realUserId: userData._id}, {$set: {withdrawDate: new Date()}}, {$unset: {participantId: '', ipAddress: '', verifyCode: '', respsStats: {}, mediaSample: '', profile: {}, startTime: '', endTime: '', condition: '', stimuliList: '', trainingResults: [], testResults: []}});
		let oldUserRecord = {
			username: userData.username,
			participated: userData.profile.exp.participated,
			sideNotes: userData.profile.exp.sideNotes,
			date: new Date()
		};
		deletedUserRepo.insert(oldUserRecord);
	}
	recordAdminLog('normal', 'deleteUserAccount', data.clientIP, '', 'user deleted ' + userData.username, Meteor.user() && Meteor.user().username);
	Meteor.users.remove({_id: userData._id});
	return {type: 'ok'};
};

export let unsubscribeMails = (data)=>{
	let user = Meteor.users.findOne({_id: data.userId});
	if(user) {
		Meteor.users.update({_id: data.userId}, {$set: {'profile.subscribe': false}});
		recordAdminLog('normal', 'unsubscribeMails', data.clientIP, '', user._id, user.username);
		return {type: 'ok'};
	}
	recordAdminLog('warning', 'unsubscribeMails', data.clientIP, '', data.userId, '');
	return {type: 'error', errMsg: 'vitale'};
};

function recordAdminLog (logType, func, userIP, expId, logNote, userName) {
	adminLogDB.insert({
		type: logType,
		function: func,
		user: userName,
		exp: expId,
		note: logNote,
		ipAddress: userIP,
		date: new Date()
	});	
};