import { Session } from 'meteor/session';

export let enterFullScreen = function() {
	if (document.body.requestFullScreen) {
        document.body.requestFullScreen();
    } else if (document.body.mozRequestFullScreen) {
        document.body.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    } else if (document.body.msRequestFullscreen) {
        document.body.msRequestFullscreen();
    }
};

export let exitFullScreen = function() {
	if (document.cancelFullScreen) {
        document.cancelFullScreen();
	} else if (document.mozCancelFullScreen) {
    	document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
};

export let processLongTexts = function(text) {
	let textLines = text.split('\n');
	let processedTexts = [];
	for(let i=0 ; i<textLines.length ; i++) {
		if(textLines[i].trim() !== '') {
			processedTexts.push(textLines[i]);
		}
	}
	return processedTexts;
};

export let randomSelectItem = function(list, unique) {
	let uniqueList = [];
	if(unique) {
		for(let i=0 ; i<list.length ; i++) {
			if(uniqueList.indexOf(list[i]) < 0) {
				uniqueList.push(list[i]);
			}
		}
	}
	else {
		uniqueList = list;
	}
	let rand = Math.random(), randSelect = Math.floor(rand*uniqueList.length);
	return uniqueList[randSelect];
};

export let stimuliOrderer = function(stimuli, trainingBl, testBl, skipTraining) {
	let orderedStimuliLists = {training: [], test: []}, randomizedStimuliList = [];
	let blockTrials, starting = skipTraining ? 1 : 0;
	for(let i=starting ; i<stimuli.length ; i++) {
		let stimuliList = stimuli[i], blocks;
		if(i === 0) {
			blocks = trainingBl;
		}
		else {
			blocks = testBl;
		}
		blockTrials = new Array();

		for(let j=0 ; j<blocks.length ; j++) {
			blockTrials[j] = [];
			currentLabel = blocks[j].label;
			for(let k=0 ; k<stimuliList.Block.length ; k++) {
				if(currentLabel === stimuliList.Block[k]) {
					blockTrials[j].push(k);
				}
			}
		}

		let session = 'test';
		if(i === 0 && !skipTraining) {
			session = 'training';
		}

		for(let j=0 ; j<blocks.length ; j++) {
			if(blocks[j].random) {
				do {
					index = Math.floor(Math.random() * blockTrials[j].length);
					if(!randomizedStimuliList[j]) {
						randomizedStimuliList[j] = [];
					}
					randomizedStimuliList[j].push(blockTrials[j][index]);
					blockTrials[j].splice(index, 1);
				}
				while(blockTrials[j].length > 0);
			}
			else {
				randomizedStimuliList[j] = blockTrials[j];
			}
		}
		orderedStimuliLists[session] = randomizedStimuliList;
		randomizedStimuliList = [];
	}
	return orderedStimuliLists;
};