var timeout = setTimeout(()=>{}, 0);

export let animateBackground = function(target, color, time) {
	$(target).animate({
		backgroundColor: color
	}, time);
};

export let showWarning = function(msg, cat) {
	clearTimeout(timeout);
	if(!cat) {
		let interfaceMsg = translationDB.findOne({docType: 'general'})[msg];
		$('#warning').html(interfaceMsg);
	}
	else if(cat === 'experimenter') {
		let experimenterTexts = translationDB.findOne({docType: cat});
		$('#warning').html(experimenterTexts[msg]);
	}
	else if(cat === 'challenger') {
		let challengerTexts = translationDB.findOne({docType: cat});
		$('#warning').html(challengerTexts[msg]);
	}
	$('#warning').animate({
		width: '100%'
	}, 300, function() {
		$(this).css({
			left: 'initial',
			right: '0'
		});
	});
	timeout = setTimeout(()=>{
		$('#warning').animate({
			width: 0
		}, 300, function() {
			$(this).css({
				left: '0',
				right: 'initial'
			});
		});
		$('#warning').html('');
	}, 5000);
};