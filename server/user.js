import { Accounts } from 'meteor/accounts-base';
import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { fetch } from 'meteor/fetch';

var emailFormat = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var deleteThreshold = 3*3600*1000*24;

//---------------Regular Check Functions----------------
var cleanUnverifiedUsers = async ()=>{
	let currentTime = new Date();
	Meteor.users.find({'emails.0.verified': false, 'profile.verifyDue': {$lte: currentTime}}).forEachAsync(async (user)=>{
		let oldUserRecord = {
			username: user.username,
			participated: user.profile.exp.participated,
			sideNotes: user.profile.exp.sideNotes,
			date: new Date()
		};
		await deletedUserRepo.insertAsync(oldUserRecord);
		await Meteor.users.removeAsync({_id: user._id});
	});
	adminLogDB.insertAsync({
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
Accounts.emailTemplates.from = 'ENIGMA Admin <noreply@lngproc.hss.nthu.edu.tw>';

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

Accounts.emailTemplates.verifyEmail.text = async (user, url) => {
	let regTemplate = await Assets.getTextAsync('emails/registration_'+user.profile.userLang+'.txt');
	url = url.replace('http', 'https');
	url = url.replace('#/verify-email', 'verify/'+user.profile.userLang);
	regTemplate = regTemplate.replace('[url]', url);
	return regTemplate;
};

Accounts.emailTemplates.resetPassword.text = async (user, url) => {
	let regTemplate = await Assets.getTextAsync('emails/forgetPW_'+user.profile.userLang+'.txt');
	url = url.replace('http', 'https');
	url = url.replace('#/reset-password', 'resetPW/'+user.profile.userLang+'/'+user.profile.userCat);
	regTemplate = regTemplate.replace('[url]', url);
	return regTemplate;
};

Accounts.validateNewUser(async (user)=>{
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
	else if(!await allLangList.findOneAsync({code: user.profile.L1}) || 
		(user.profile.L2 !== 'na' && !await allLangList.findOneAsync({code: user.profile.L2}))) {
		errMsg.push('vitale');
	}
	if(errMsg.length > 0) {
		throw new Meteor.Error(555, errMsg[0]);
	}
	else {
		//checkEmailValidaty(user.username).then((checkRes)=>{
		//	if(checkRes) {
		//		throw new Meteor.Error(555, 'emailunacceptable');
		//	}
			return true;
		//});
	}
});

Accounts.onCreateUser(async (options, user)=>{
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
		let oldUserRecord = await deletedUserRepo.findOneAsync({username: options.username});
		if(oldUserRecord) {
			customProfile.exp.participated = oldUserRecord.participated;
			customProfile.exp.sideNotes = oldUserRecord.sideNotes;
			await deletedUserRepo.removeAsync({username: options.username});
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

Accounts.validateLoginAttempt(async (attempt)=>{
	//Block new users from being logged in automatically
	if(attempt.methodName === 'createUser' || !attempt.user) {
		return false;
	}
	if(!attempt.allowed) {
		await recordAdminLog('warning', 'validateLoginAttempt', attempt.connection.clientAddress, '', 'login failed: ' + attempt.user._id, 'server');
		return false;
	}
	let userData = await Meteor.users.findOneAsync({_id: attempt.user._id});
	let lastLoginIP = userData && userData.profile.loginAttemptIP.currentLogin;
	let lastLoginTime = userData && userData.profile.loginAttemptIP.currentLoginTime;
	await Meteor.users.updateAsync({_id: attempt.user._id}, {$set: 
		{'profile.loginAttemptIP.lastLogin': lastLoginIP,
		'profile.loginAttemptIP.lastLoginTime': lastLoginTime,
		'profile.loginAttemptIP.currentLogin': attempt.connection.clientAddress,
		'profile.loginAttemptIP.currentLoginTime': new Date()
	}});
	await recordAdminLog('normal', 'validateLoginAttempt', attempt.connection.clientAddress, '', 'login successful: ' + userData.username, 'server');
	return true;
});

//--------------Functions called from the entry 'window'----------------
export let getAbout = async (data)=>{
	let errMsg = [];
	if(data.userCat === '') {
		data.userCat = 'challenger';
	}
	let aboutFilename = 'about_'+data.userCat+'_'+data.userLang+'.txt';
	try {
		let aboutDoc = await Assets.getTextAsync('about/'+aboutFilename);
		let user = await Meteor.userAsync();
		let username = (user && user.username) || 'guest';
		await recordAdminLog('normal', 'getAbout', data.clientIP, '', 'get about file ' + aboutFilename, username);
		return {type: 'ok', about: aboutDoc};
	}
	catch(err) {
		errMsg.push('vitale');
		await recordAdminLog('warning', 'getAbout', data.clientIP, '', 'failed to get about file ' + aboutFilename, username);
		return errMsg;
	}
};

export let getUserAgreement = async (data)=>{
	let errMsg = [], user = await Meteor.userAsync();
	let userAgreeFilename = 'userAgreement_'+data.userCat+'_'+data.userLang+'.txt';
	try {
		let userAgreement = await Assets.getTextAsync('userAgreement/'+userAgreeFilename);
		await recordAdminLog('normal', 'getUserAgreement', data.clientIP, '', 'get user agreement ' + userAgreeFilename, user && user.username);
		return {type: 'ok', agreement: userAgreement};
	}
	catch(err) {
		errMsg.push('vitale');
		await recordAdminLog('warning', 'getUserAgreement', data.clientIP, '', 'failed to get user agreement ' + userAgreeFilename, user && user.username);
		return errMsg;
	}
};

export let resendUserEmail = async (data)=>{
	let errMsg = [], userId = null, verified = false, user = await Meteor.userAsync();
	try {
		if(!emailFormat.test(data.email)) {
			await recordAdminLog('warning', 'resendUserEmail', data.clientIP, '', 'email format', user && user.username);
			errMsg.push('emailformate');
		}
		else if(!await Meteor.users.findOneAsync({username: data.email})) {
			await recordAdminLog('warning', 'resendUserEmail', data.clientIP, '', 'no user', user && user.username);
			errMsg.push('emailnotexiste');
		}
		else if(data.email.length > 100) {
			await recordAdminLog('warning', 'resendUserEmail', data.clientIP, '', 'email length', user && user.username);
			errMsg.push('vitale');
		}
		else {
			let existingUser = await Meteor.users.findOneAsync({username: data.email});
			userId = existingUser._id;
			verified = existingUser.emails[0].verified;
		}
		if(verified && data.type === 'resendVerify') {
			errMsg.push('vitale');
		}
	}
	catch(err) {
		await recordAdminLog('warning', 'resendUserEmail', data.clientIP, '', 'try and catch issue', user && user.username);
		errMsg.push('vitale');
	}
	if(errMsg.length === 0) {
		if(data.type === 'resendVerify')
		{
			let resendLog = await mailLogDB.findOneAsync({type: 'resendVerify', email: data.email}, {sort: {date: -1}});
			if(resendLog && ((new Date()).getTime() - resendLog.date.getTime()) / (300 * 1000) <= 5) {
				return {type: 'error', errMsg: ['shortresend']};
			}
			await Meteor.users.updateAsync({_id: userId}, {$set: {'services.email.verificationTokens': []}});
			await Accounts.sendVerificationEmail(userId, data.email);
			await mailLogDB.insertAsync({type: 'resendVerify', email: data.email, date: new Date()});
		}
		else {
			let resendLog = await mailLogDB.findOneAsync({type: 'sendResetPassword', email: data.email}, {sort: {date: -1}});
			if(resendLog && ((new Date()).getTime() - resendLog.date.getTime()) / (300 * 1000) <= 5) {
				return {type: 'error', errMsg: ['shortresend']};
			}
			await Accounts.sendResetPasswordEmail(userId, data.email);
			await mailLogDB.insertAsync({type: 'sendResetPassword', email: data.email, date: new Date()});
		}
		await recordAdminLog('normal', 'resendUserEmail', data.clientIP, '', 'resent verify/password email ' + data.email, user && user.username);
		return {type: 'ok'};
	}
	else {
		return {type: 'error', errMsg: errMsg};
	}
};

export let appResetPW = async (data)=> {
	let user = await Meteor.userAsync();
	let results = await Meteor.callAsync('resetPassword', data.token, data.password);
	if(results.error) {
		await recordAdminLog('warning', 'appResetPW', data.clientIP, '', 'reset pw error', user && user.username);
		return {type: 'error', errMsg: results.error};
	}
	else {
		await recordAdminLog('normal', 'appResetPW', data.clientIP, '', 'reset pw', user && user.username);
		return {type: 'ok'};
	}
};

export let rememberLogin = async (data)=>{
	let errMsg = [], user = await Meteor.userAsync();
	if(!Meteor.userId() || (data.remember !== false && data.remember !== true)) {
		await recordAdminLog('warning', 'rememberLogin', data.clientIP, '', 'critical error', user && user.username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		await Meteor.users.updateAsync({_id: user._id}, {$set: {'profile.rememberMe': data.remember}});
		await recordAdminLog('normal', 'rememberLogin', data.clientIP, '', 'remember current login', user && user.username);
		return {type: 'ok'};
	}
};

export let changeProfile = async (data)=>{
	let errMsg = [], result = {type: 'ok', password: false, username: false};
	let user = await Meteor.userAsync();
	if(!user) {
		if(data.password !== '') {
			result.password = true;
		}
		else {
			result.username = true;
		}
		return result;
	}
	if(!/^(zh-tw|en-us)$/ig.test(data.userLang)) {
		errMsg.push('vitale');
	}
	else if(!emailFormat.test(data.username)) {
		await recordAdminLog('warning', 'changeProfile', data.clientIP, '', 'email format', user && user.username);
		errMsg.push('emailformate');
	}
	else if(data.username !== user.username && await Accounts.findUserByUsername(data.username)) {
		await recordAdminLog('warning', 'changeProfile', data.clientIP, '', 'email existed', user && user.username);
		errMsg.push('emailexiste');
	}
	else if(data.username !== user.username) {
		let resendLog = await mailLogDB.findOneAsync({type: 'resendVerify', email: user.username}, {sort: {date: -1}});
		if(resendLog && ((new Date()).getTime() - resendLog.date.getTime()) < 300 * 1000) {
			errMsg.push('shortresend');
			await recordAdminLog('warning', 'changeProfile', data.clientIP, '', 'short resend gap', user && user.username);
		}
	}
	if(errMsg.length === 0) {
		await Meteor.users.updateAsync({_id: user._id}, {$set: {'profile.userLang': data.userLang}});
		if(data.password !== '') {
			result.password = true;
			await Accounts.setPasswordAsync(user._id, data.password);
		}
		if(data.username !== user.username) {
			result.username = true;
			let currentTime = new Date();
			await Accounts.addEmailAsync(user._id, data.username);
			Accounts.removeEmail(user._id, user.username);
			Accounts.setUsername(user._id, data.username);
			await Meteor.users.updateAsync({_id: user._id}, {$set: {'services.email.verificationTokens': [],
				'profile.verifyDue': new Date(currentTime.getTime() + deleteThreshold)}});
			Accounts.sendVerificationEmail(user._id, data.username);
			await mailLogDB.insertAsync({type: 'resendVerify', email: data.username, date: new Date()});
			let subject = 'ENIGMA: Your e-mail has changed.';
			if(data.userLang === 'zh-tw') {
				subject = '字謎：您的帳號電子郵件已變更。';
			}
			let changeEmailNoteBody = await Assets.getTextAsync('emails/changeEmailNote_'+data.userLang+'.txt');
			changeEmailNoteBody = changeEmailNoteBody.replace('[newEmail]', data.username);
			changeEmailNoteBody = changeEmailNoteBody.replace('[time]', ''+currentTime);
			changeEmailNoteBody = changeEmailNoteBody.replace('[ipAddress]', data.clientIP);
			await Email.sendAsync({
				to: user.username,
				from: 'ENIGMA Admin <noreply@lngproc.hss.nthu.edu.tw>', 
				subject: subject, 
				text: changeEmailNoteBody
			});
			await mailLogDB.insertAsync({type: 'changeemailnote', user: user.username, date: new Date()});
			if(user._id) {
				await Meteor.users.updateAsync({_id: user._id}, {$set: {'services.resume.loginTokens': []}});
			}
		}
		await recordAdminLog('normal', 'changeProfile', data.clientIP, '', 'profile changed', user && user.username);
		return result;
	}
	else {
		return {type: 'error', errMsg: errMsg};
	}
};

export let clearNewAchievements = async (data)=>{
	let user = await Meteor.userAsync();
	if(user && user.emails[0].verified) {
		await Meteor.users.updateAsync({_id: user._id}, {$set: {'profile.gaming.newAchieve': 0}});
	}
	await recordAdminLog('normal', 'clearNewAchievements', data.clientIP, '', 'clear new achievements', user && user.username);
	return {type: 'ok'};
};

export let removeExpStats = async (data)=> {
	let user = await Meteor.userAsync();
	let targetRes = await expStatsDB.findOneAsync({_id: data.targetId, userId: user._id});
	let runExpRecord = user && user.runExpRecord;
	if(!user || !(user && user.emails[0].verified) || !targetRes ||
		(runExpRecord && runExpRecord.challenging && runExpRecord.expId === targetRes.expId)) {
		await recordAdminLog('warning', 'removeExpStats', data.clientIP, '', 'remove exp stats', user && user.username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		await expStatsDB.removeAsync({_id: data.targetId, userId: targetRes.userId});
		await recordAdminLog('normal', 'removeExpStats', data.clientIP, '', 'exp stats removed ' + user.username, user && user.username);
		if(await expResultsDB.findOneAsync({expId: targetRes.expId, realUserId: targetRes.userId, verifyCode: targetRes.verifyCode})) {
			if(!user.profile.exp.sideNotes.frequentQuitter.recorded) {
				let counts = user.profile.exp.sideNotes.frequentQuitter.counts;
				if(counts + 1 === 3) {
					let newSideNotes = {recorded: true, counts: 3, date: new Date()};
					await Meteor.users.updateAsync({_id: user._id}, {$set: {'profile.exp.sideNotes.frequentQuitter': newSideNotes}});
				}
				else {
					await Meteor.users.updateAsync({_id: user._id}, {$inc: {'profile.exp.sideNotes.frequentQuitter.counts': 1}});
				}
			}
			await expResultsDB.updateAsync({expId: targetRes.expId, realUserId: targetRes.userId},
				{$set: {withdrawDate: new Date()}},
					{$unset: 
						{participantId: '', ipAddress: '', verifyCode: '', respsStats: {}, mediaSample: '', profile: {}, startTime: '', endTime: '', condition: '', stimuliList: '', trainingResults: [], testResults: []}
					}
				);
		}
		return {type: 'ok'};
	}
};

export let getConsent = async (data) => {
	let user = await Meteor.userAsync();
	let targetRes = await expStatsDB.findOneAsync({_id: data.targetId, userId: user._id});
	let runExpRecord = user && user.runExpRecord;
	if(!user || !(user && user.emails[0].verified) || !targetRes) {
		await recordAdminLog('warning', 'getConsent', data.clientIP, '', 'get consent form', user && user.username);
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
    	await recordAdminLog('normal', 'getConsent', data.clientIP, '', 'get consent form by ' + user.username, user && user.username);
		return {type: 'ok', msg: data.targetId + '_' + date + '.zip'};
	}
};

export let deleteUserAccount = async (data)=>{
	let user = await Meteor.userAsync();
	if(!user) {
		await recordAdminLog('warning', 'deleteUserAccount', data.clientIP, '', 'no user', user && user.username);
		return {type: 'error', errMsg: ['vitale']};
	}
	let checkPWDResult = await Accounts._checkPasswordAsync(user, data.password);
	if(checkPWDResult.error && checkPWDResult.error.error === 403) {
		await recordAdminLog('warning', 'deleteUserAccount', data.clientIP, '', 'wrong pwd', user && user.username);
		return {type: 'error', errMsg: ['deleteaccounte']};
	}
	else if(checkPWDResult.error) {
		await recordAdminLog('warning', 'deleteUserAccount', data.clientIP, '', 'critical error', user && user.username);
		return {type: 'error', errMsg: ['vitale']};
	}
	if(user.profile.userCat === 'experimenter') {
		experimentDB.find({user: user._id}).forEachAsync(async (exp)=>{
			await expResultsDB.removeAsync({expId: exp._id});
		});
		await experimentDB.removeAsync({user: user._id});
	}
	else {
		await wmStatsDB.removeAsync({userId: user._id});
		await expStatsDB.removeAsync({userId: user._id});
		await expResultsDB.updateAsync({realUserId: user._id}, {$set: {withdrawDate: new Date()}}, {$unset: {participantId: '', ipAddress: '', verifyCode: '', respsStats: {}, mediaSample: '', profile: {}, startTime: '', endTime: '', condition: '', stimuliList: '', trainingResults: [], testResults: []}});
		let oldUserRecord = {
			username: user.username,
			participated: user.profile.exp.participated,
			sideNotes: user.profile.exp.sideNotes,
			date: new Date()
		};
		await deletedUserRepo.insertAsync(oldUserRecord);
	}
	await recordAdminLog('normal', 'deleteUserAccount', data.clientIP, '', 'user deleted ' + user.username, user && user.username);
	await Meteor.users.removeAsync({_id: user._id});
	return {type: 'ok'};
};

export let unsubscribeMails = async (data)=>{
	let user = await Meteor.users.findOneAsync({_id: data.userId});
	if(user) {
		await Meteor.users.updateAsync({_id: data.userId}, {$set: {'profile.subscribe': false}});
		await recordAdminLog('normal', 'unsubscribeMails', data.clientIP, '', user._id, user.username);
		return {type: 'ok'};
	}
	await recordAdminLog('warning', 'unsubscribeMails', data.clientIP, '', data.userId, '');
	return {type: 'error', errMsg: 'vitale'};
};

async function recordAdminLog (logType, func, userIP, expId, logNote, userName) {
	await adminLogDB.insertAsync({
		type: logType,
		function: func,
		user: userName,
		exp: expId,
		note: logNote,
		ipAddress: userIP,
		date: new Date()
	});	
};

async function checkEmailValidaty (email) {
	let at = email.indexOf('@');
	let domain = email.substring(at + 1);
	let block = await fetchAsync('https://mailcheck.p.rapidapi.com/?domain=' + domain, 
			{
				method: 'GET',
  				headers: {
    				'x-rapidapi-host': 'mailcheck.p.rapidapi.com',
    				'x-rapidapi-key': 'X6rqPPK0p3mshxAqetrE8oSxAm1Kp1rVF3ojsne1azO6uB2mVo',
  				}
			}).then(resp => resp.json()).then(data =>{
				return data.block;
			});
	return block;
};