import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Session } from 'meteor/session';

function blockDirectRouting() {
	if(!Meteor.user()) {
		FlowRouter.go('entrance');
		return false;
	}
	return true;
}

FlowRouter.route('/', {
	name: 'entrance',
	whileWaiting() {
		BlazeLayout.render('defaultLayout', {main: 'loading'});
	},
	waitOn() {
		return Meteor.subscribe('userData', Meteor.userId());
	},
	endWaiting() {
		if(!Meteor.user()) {
			BlazeLayout.render('defaultLayout', {main: 'langChoose'});
		}
	}
});

FlowRouter.route('/home', {
	name: 'home',
	action() {
		BlazeLayout.render('defaultLayout', {main: 'home'});
	}
});

FlowRouter.route('/userhome/:subpage', {
	name: 'userhome',
	action(params) {
		if(blockDirectRouting()) {
			let subpage = params.subpage;
			BlazeLayout.render('defaultLayout', {main: 'loading'});
			if(Session.equals('userCat', 'challenger'))
			{
				if(subpage === 'dashboard') {
					import('./challenger/dashboard.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'dashboard_cha', sideMenu: 'challengerMenu'});
					});
				}
				else if(subpage === 'profile') {
					import('./challenger/profile.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'profile_cha', sideMenu: 'challengerMenu'});
					});
				}
				else if(subpage === 'explore') {
					import('./challenger/explore.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'explore', sideMenu: 'challengerMenu'});
					});
				}
				else if(subpage === 'history') {
					import('./challenger/history.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'history', sideMenu: 'challengerMenu'});
					});
				}
				else if(subpage === 'achievements') {
					import('./challenger/achievements.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'achievements', sideMenu: 'challengerMenu'});
					});
				}
			}
			else {
				if(subpage === 'dashboard') {
					import('./experimenter/dashboard.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'dashboard_exp', sideMenu: 'experimenterMenu'});
					});
				}
				else if(subpage === 'profile') {
					import('./experimenter/profile.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'profile_exp', sideMenu: 'experimenterMenu'});
					});
				}
				else if(subpage === 'manageExp') {
					import('./experimenter/manageExp.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'manageExp', sideMenu: 'experimenterMenu'});
					});
				}
				else if(subpage === 'createExp') {
					import('./experimenter/manageExp.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'createExp', sideMenu: 'experimenterMenu'});
					});
				}
				else if(subpage === 'checkExpSettings') {
					import('./experimenter/checkExpSettings.js').then(()=>{
						BlazeLayout.render('contentLayout', {body: 'checkExpSettings', sideMenu: 'experimenterMenu'});
					});
				}
			}
		}
	}
});

FlowRouter.route('/login', {
	name: 'login',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./login.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'login', sideMenu: 'loginMenu'});
		});
	}
});

FlowRouter.route('/forgotPW', {
	name: 'forgotPW',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./login.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'forgotPW', sideMenu: 'loginMenu'});
		});
	}
});

FlowRouter.route('/forgotPWSent', {
	name: 'forgotPWSent',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./login.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'forgotPWSent', sideMenu: 'loginMenu'});
		});
	}
});

FlowRouter.route('/resetPW/:lang/:userCat/:code', {
	name: 'resetPassword',
	action(params) {
		Session.set('userLang', params.lang);
		Session.set('userCat', params.userCat);
		Session.set('verifyCode', params.code.replace(/\s/g),'');
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./login.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'resetPW', sideMenu: 'registerMenu'});
		});
	}
});

FlowRouter.route('/register', {
	name: 'register',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./register.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'register', sideMenu: 'registerMenu'});
		});
	}
});

FlowRouter.route('/registered', {
	name: 'registered',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./register.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'registered', sideMenu: 'registerMenu'});
		});
	}
});

FlowRouter.route('/verify/:lang/:code', {
	name: 'verification',
	action(params) {
		Session.set('userLang', params.lang);
		Session.set('verifyCode', params.code.replace(/\s/g),'');
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./register.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'verify', sideMenu: 'registerMenu'});
		});
	}
});

FlowRouter.route('/resendVerify', {
	name: 'resendVerify',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./register.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'resendVerify', sideMenu: 'registerMenu'});
		});
	}
})

FlowRouter.route('/about', {
	name: 'about',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./about.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'about', sideMenu: 'aboutMenu'});
		});
	}
});

FlowRouter.route('/deleteExp/:expid', {
	name: 'deleteExp',
	action() {
		if(blockDirectRouting()) {
			BlazeLayout.render('contentLayout', {body: 'loading'});
			import('./experimenter/manageExp.js').then(()=>{
				BlazeLayout.render('contentLayout', {body: 'deleteExp', sideMenu: 'sideMenu'});
			});
		}
	}
});

FlowRouter.route('/completeExp/:expid', {
	name: 'completeExp',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./exp/completeExp.js').then(()=>{
			let menuType = Meteor.user() && Session.equals('userCat', 'experimenter') ? 'experimenterMenu' : 'aboutMenu';
			BlazeLayout.render('contentLayout', {body: 'completeExp', sideMenu: menuType});
		});
	}
});

FlowRouter.route('/deleteAccount', {
	name: 'deleteAccount',
	action() {
		if(blockDirectRouting()) {
			BlazeLayout.render('contentLayout', {body: 'loading'});
			if(Meteor.user() && Meteor.user().profile.userCat === 'experimenter') {
				import('./experimenter/profile.js').then(()=>{
					BlazeLayout.render('contentLayout', {body: 'exp_deleteAccount', sideMenu: 'experimenterMenu'});
				});
			}
			else {
				import('./challenger/profile.js').then(()=>{
					BlazeLayout.render('contentLayout', {body: 'cha_deleteAccount', sideMenu: 'challengerMenu'});
				});
			}
		}
	}
});

FlowRouter.route('/unsubscribe/:userLang/:id', {
	name: 'unsubscribe',
	action(params) {
		Session.set('userLang', params.userLang);
		BlazeLayout.render('contentLayout', {body: 'loading'});
		Meteor.call('funcEntryWindow', 'user', 'unsubscribeMails', {userId: params.id},
			(err, result)=>{
				alert('OK.');
				FlowRouter.go('home');
			});
	}
});

FlowRouter.route('/configExp/:subpage/:expid', {
	name: 'configExp',
	action(params) {
		if(blockDirectRouting()) {
			let subpage = params.subpage;
			BlazeLayout.render('contentLayout', {body: 'loading'});
			import('./experimenter/configExp.js').then(()=>{
				if(subpage === 'basicInfo') {
					BlazeLayout.render('contentLayout', {body: 'configBasicInfo', sideMenu: 'configExpMenu'});
				}
				else if(subpage === 'orientation') {
					BlazeLayout.render('contentLayout', {body: 'orientation', sideMenu: 'configExpMenu'});
				}
				else if(subpage === 'trainingConfig') {
					BlazeLayout.render('contentLayout', {body: 'trainingConfig', sideMenu: 'configExpMenu'});
				}
				else if(subpage === 'testConfig') {
					BlazeLayout.render('contentLayout', {body: 'testConfig', sideMenu: 'configExpMenu'});
				}
				else if(subpage === 'debriefing') {
					BlazeLayout.render('contentLayout', {body: 'debriefing', sideMenu: 'configExpMenu'});
				}
			});
		}
	}
});

FlowRouter.route('/completeExpInfo/:expid', {
	name: 'completeExpInfo',
	action(params) {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		Session.set('expId', params.expid);
		Session.set('browseSession', 'completeExpInfo');
		import('./experimenter/completeExp.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'completeExpInfo', sideMenu: 'aboutMenu'});
		});
	}
});

FlowRouter.route('/runExp/:expid', {
	name: 'runExp',
	action() {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		import('./exp/runexp.js').then(()=>{
			BlazeLayout.render('expLayout', {body: 'expPanels'});
		});
	}
});

FlowRouter.route('/runExp/:lang/:expid', {
	name: 'runExp',
	whileWaiting() {
		BlazeLayout.render('defaultLayout', {main: 'loading'});
	},
	waitOn() {
		return Meteor.subscribe('userData', Meteor.user());
	},
	endWaiting() {
		let currentExpId = FlowRouter.getParam('expid');
		let userData = Meteor.user();
		Session.set('expId', currentExpId);
		if(userData && userData.userCat === 'challenger') {
			import('./exp/runexp.js').then(()=>{
				BlazeLayout.render('expLayout', {body: 'expPanels'});
			});
		}
		else if(userData && userData.userCat === 'experimenter') {
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
		else {
			Session.set('userCat', 'challenger');
			Session.set('userLang', FlowRouter.getParam('lang'));
			Session.set('holdSession', {hold: true, sessionType: 'runExp', sessionId: currentExpId});
			FlowRouter.go('login');
		}
	}
});

FlowRouter.route('/expResults/:lang/:results/:session', {
	name: 'expResults',
	action(params) {
		BlazeLayout.render('contentLayout', {body: 'loading'});
		Session.set('userLang', params.lang);
		import('./exp/expResults.js').then(()=>{
			BlazeLayout.render('contentLayout', {body: 'expResults', sideMenu: 'aboutMenu'});
		});
	}
});

FlowRouter.route('/runWmExp', {
	name: 'wmExp',
	action() {
		if(blockDirectRouting()) {
			BlazeLayout.render('expLayout', {body: 'loading'});
			import('./exp/runWMExp.js').then(()=>{
				BlazeLayout.render('expLayout', {body: 'expWMPanels'});
			});
		}
	}
});

FlowRouter.route('/wmHistory', {
	name: 'wmHistory',
	action() {
		if(blockDirectRouting()) {
			BlazeLayout.render('contentLayout', {body: 'loading'});
			import('./challenger/wmHistory.js').then(()=>{
				BlazeLayout.render('contentLayout', {body: 'wmHistory', sideMenu: 'challengerMenu'});
			});
		}
	}
});