<article>
	<h1>ENIGMA: A Web application for running online artificial grammar learning experiments</h1>
	<section>
		<h2>General Info</h2>
		<p>Official Website: <a href="https://enigma-lang.org" target="_blank">https://enigma-lang.org</a></p>
		<p>Facebook: <a href="https://www.facebook.com/Enigma.NTHU" target="_blank">https://www.facebook.com/Enigma.NTHU</a></p>
		<p>Tutorial Videos (Youtube): <a href="https://www.youtube.com/channel/UC24SonuOW4CoWppcupesqEw" target="_blank">https://www.youtube.com/channel/UC24SonuOW4CoWppcupesqEw</a></p>
		<p><em>Copyright 2024 Tsung-Ying Chen, Department of Foreign Languages & Literature, National Tsing Hua University, Taiwan</em></p>
	</section>
	<section>
		<h2>Introduction</h2>
		<p>ENIGMA is a free and open-source Web application specifically designed to run online experiments based on the artificial grammar learning paradigm. The application is built with Meteor v3.03 (<a href="https://meteor.com" target="_blank">https://meteor.com</a>), a JavaScript-based open-source package for Web application development. Users could clone the source codes in this repository and compile it using Meteor v3.03 or above to run the application on their own server, or to simply use the official version. The application is the research outcome of the project "A Comprehensive Examination of Evidence and Methodology in Artificial Grammar Learning" funded by the National Council of Science and Technology, Taiwan.</p>
		<p>ENIGMA is built with the following Meteor packages (in addition to the core, build-in Meteor packages): <em>accounts-base, ddp-rate-limiter, email, fetch, pwix:blaze-layout, mongo, ostrio:flow-router-extra, reactive-var, session, templating, tracker, udondan:jszip</em></p>
		<p>ENIGMA is built with the following NPM packages (in addition to the core, build-in NPM packages for Node.js v20): <em>file-saver</em></p>
		<p>Note that to deploy ENIGMA as a Meteor application in the production mode, an independent database building on <a href="https://www.mongodb.com/" target="_blank">MongoDB</a> (version >= 7.0) is necessary.</p>
	</section>
	<section>
		<h2>Critical Settings</h2>
		<p>To host ENIGMA in your own server, serval critical changes regarding the home URL and different paths have to be made in the source codes.</p>
		<h3>Server domain URL and path to ENIGMA</h3>
		<p>The domain URL of the server and the URL path to your ENIGMA application have to be set first.<br/>
			Related file:<br/>
			/client/lib/globalVar.js
		</p>
		<h3>Temporary server file folder</h3>
		<p>Experiment results are compressed on the server side first and stored temporarily to a server folder that could be retrieved by an ENIGMA user via the HTTP(S) protocol, and the path the store the temporary result files.<br/>
			Related file:<br/>
			/server/experiment.js
		</p>
	</section>
	<section>
		<h2>E-mail Contents</h2>
		<p>ENIGMA composes all e-mail messages automatically, and the information contained in these messages have to be tailored following new preferences and settings.</p>
		<p>Message texts:<br/>
			/private/emails/*.txt
		</p>
		<p>
			Message headers/title/sender e-mail/etc:<br/>
			/server/dbProcesses.js<br/>
			/server/user.js
		</p>
	</section>
	<section>
		<h2>Images/Icons/Files</h2>
		<p>Visual images and icons used in ENIGMA are licensed to Tsung-Ying Chen by <a href="https://www.streamlinehq.com/" target="_blank">Streamline</a>. The images and icons could be found in /icons and /illustrations only for reference. They should not be directly incorporated into any extended work from this official version of ENIGMA, unless the host of the extended version also subscribes to the online image database. Files like user manuals could be linked to our official document upon request, but you can link to your own files, too.</p>
		<h3>URLs and Paths</h3>
		<p>URLs and paths to images, icons, and other files could be primarily found in the challenger system, which should be modified to link to the host's own images. The paths have to be modified in the following files:<br/>
			(Check iconURL() in particular)<br/>
			/client/scripts/challenger/*.js<br/>
			/client/scripts/exp/expResults.js<br/>
			/client/template/challenger/history.html<br/>
			/client/template/challenger/profile.html<br/>
			/client/template/exp/expResults.html<br/>
			/client/template/exp/runExp.html<br/>
			/client/template/experimenter/dashboard.html<br/>
			/client/template/experimenter/checkExpSettings.html<br/>
			/client/template/experimenter/manageExp.html<br/>
			/client/template/experimenter/profile.html<br/>
			/client/template/register.html<br/>
			/private/about/*.txt
		</p>
	</section>
	<section>
		<h2>Admin Account</h2>
		<p>A default admin account could be added to ENIGMA's user system with the settings in /server/main.js. However, currently ENIGMA doesn't have any function for administration. We are currently maintaining the database directly via the official MongoDB tool.</p>
	</section>
	<section>
		<p><em>Last updated on Sep 23, 2024</em></p>
	</section>
</article>