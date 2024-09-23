import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import Styling from './styling/stylingFuncs.js';
import Tools from './lib/commonTools.js';

import '../template/about.html';
import '../template/menus.html';
import './menus.js';

let interfaceL = new ReactiveVar(null);

Tracker.autorun(()=>{
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.header.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.footer.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.about.onCreated(()=>{
	Meteor.callAsync('funcEntryWindow', 'user', 'getAbout', 
		{userCat: Session.get('userCat'), userLang: Session.get('userLang')}).then((data)=>{
			$('#aboutContent').html(data.about);
		}).catch((err)=>{
			Tools.callErrorHandler(err, 'server');
		});
});

Template.about.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});