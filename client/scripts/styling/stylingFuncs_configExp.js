var timeout = setTimeout(()=>{}, 0);

export let showWarning = function(msg, cat) {
	clearTimeout(timeout);
	let experimenterTexts = translationDB.findOne({docType: 'experimenter'});
	if(typeof msg === 'object') {
		let warning = '';
		if(msg.cell) {
			warning = experimenterTexts[msg.type];
			warning = warning.replace('%L', msg.line);
			warning = warning.replace('%C', msg.cell)
		}
		else if(msg.nCols) {
			warning = experimenterTexts['cellnume'];
			warning = warning.replace('%L', msg.line);
			warning = warning.replace('%C', msg.nCols)
		}
		$('#warning').html(warning);
	}
	else {
		$('#warning').html(experimenterTexts[msg]);
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