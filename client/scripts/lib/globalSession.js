import { Session } from 'meteor/session';

Session.setDefault('userLang', 'en-us');
Session.setDefault('userCat', '');
Session.setDefault('rememberMe', false);
Session.setDefault('verifyCode', '');
Session.setDefault('browseSession', '');
Session.setDefault('holdSession', null);
Session.setDefault('expId', '');
Session.setDefault('expLang', '');
Session.setDefault('expType', '');
Session.setDefault('expSession', '');
Session.setDefault('experimenterLogOnset', 0);
Session.setDefault('demoExpRes', '');