/**
 * FileInput.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html4/file/FileInput
@private
*/
define("moxie/runtime/html4/file/FileInput", [
	"moxie/runtime/html4/Runtime",
	"moxie/file/File",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Events",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Env"
], function(extensions, File, Basic, Dom, Events, Mime, Env) {
	
	function FileInput() {
		var _uid, _mimes = [], _options;

		function addInput() {
			var comp = this, I = comp.getRuntime(), shimContainer, browseButton, currForm, form, input, uid;

			uid = Basic.guid('uid_');

			shimContainer = I.getShimContainer(); // we get new ref everytime to avoid memory leaks in IE

			if (_uid) { // move previous form out of the view
				currForm = Dom.get(_uid + '_form');
				if (currForm) {
					Basic.extend(currForm.style, { top: '100%' });
				}
			}

			// build form in DOM, since innerHTML version not able to submit file for some reason
			form = document.createElement('form');
			form.setAttribute('id', uid + '_form');
			form.setAttribute('method', 'post');
			form.setAttribute('enctype', 'multipart/form-data');
			form.setAttribute('encoding', 'multipart/form-data');

			Basic.extend(form.style, {
				overflow: 'hidden',
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			});

			input = document.createElement('input');
			input.setAttribute('id', uid);
			input.setAttribute('type', 'file');
			input.setAttribute('name', _options.name || 'Filedata');
			input.setAttribute('accept', _mimes.join(','));

			Basic.extend(input.style, {
				fontSize: '999px',
				opacity: 0
			});

			form.appendChild(input);
			shimContainer.appendChild(form);

			// prepare file input to be placed underneath the browse_button element
			Basic.extend(input.style, {
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			});

			if (Env.browser === 'IE' && Env.verComp(Env.version, 10, '<')) {
				Basic.extend(input.style, {
					filter : "progid:DXImageTransform.Microsoft.Alpha(opacity=0)"
				});
			}

			input.onchange = function() { // there should be only one handler for this
				var file;

				if (!this.value) {
					return;
				}

				if (this.files) { // check if browser is fresh enough
					file = this.files[0];

					// ignore empty files (IE10 for example hangs if you try to send them via XHR)
					if (file.size === 0) {
						form.parentNode.removeChild(form);
						return;
					}
				} else {
					file = {
						name: this.value
					};
				}

				file = new File(I.uid, file);

				// clear event handler
				this.onchange = function() {}; 
				addInput.call(comp); 

				comp.files = [file];

				// substitute all ids with file uids (consider file.uid read-only - we cannot do it the other way around)
				input.setAttribute('id', file.uid);
				form.setAttribute('id', file.uid + '_form');
				
				comp.trigger('change');

				input = form = null;
			};


			// route click event to the input
			if (I.can('summon_file_dialog')) {
				browseButton = Dom.get(_options.browse_button);
				Events.removeEvent(browseButton, 'click', comp.uid);
				Events.addEvent(browseButton, 'click', function(e) {
					if (input && !input.disabled) { // for some reason FF (up to 8.0.1 so far) lets to click disabled input[type=file]
						input.click();
					}
					e.preventDefault();
				}, comp.uid);
			}

			_uid = uid;

			shimContainer = currForm = browseButton = null;
		}

		Basic.extend(this, {
			init: function(options) {
				var comp = this, I = comp.getRuntime(), shimContainer;

				// figure out accept string
				_options = options;
				_mimes = options.accept.mimes || Mime.extList2mimes(options.accept, I.can('filter_by_extension'));

				shimContainer = I.getShimContainer();

				(function() {
					var browseButton, zIndex, top;

					browseButton = Dom.get(options.browse_button);

					// Route click event to the input[type=file] element for browsers that support such behavior
					if (I.can('summon_file_dialog')) {
						if (Dom.getStyle(browseButton, 'position') === 'static') {
							browseButton.style.position = 'relative';
						}

						zIndex = parseInt(Dom.getStyle(browseButton, 'z-index'), 10) || 1;

						browseButton.style.zIndex = zIndex;
						shimContainer.style.zIndex = zIndex - 1;
					}

					/* Since we have to place input[type=file] on top of the browse_button for some browsers,
					browse_button loses interactivity, so we restore it here */
					top = I.can('summon_file_dialog') ? browseButton : shimContainer;

					Events.addEvent(top, 'mouseover', function() {
						comp.trigger('mouseenter');
					}, comp.uid);

					Events.addEvent(top, 'mouseout', function() {
						comp.trigger('mouseleave');
					}, comp.uid);

					Events.addEvent(top, 'mousedown', function() {
						comp.trigger('mousedown');
					}, comp.uid);

					Events.addEvent(Dom.get(options.container), 'mouseup', function() {
						comp.trigger('mouseup');
					}, comp.uid);

					browseButton = null;
				}());

				addInput.call(this);

				shimContainer = null;

				// trigger ready event asynchronously
				comp.trigger({
					type: 'ready',
					async: true
				});
			},


			disable: function(state) {
				var input;

				if ((input = Dom.get(_uid))) {
					input.disabled = !!state;
				}
			},

			destroy: function() {
				var I = this.getRuntime()
				, shim = I.getShim()
				, shimContainer = I.getShimContainer()
				;
				
				Events.removeAllEvents(shimContainer, this.uid);
				Events.removeAllEvents(_options && Dom.get(_options.container), this.uid);
				Events.removeAllEvents(_options && Dom.get(_options.browse_button), this.uid);
				
				if (shimContainer) {
					shimContainer.innerHTML = '';
				}

				shim.removeInstance(this.uid);

				_uid = _mimes = _options = shimContainer = shim = null;
			}
		});
	}

	return (extensions.FileInput = FileInput);
});