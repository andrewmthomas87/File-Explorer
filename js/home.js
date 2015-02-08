
var currentDirectory = '', fileURLs;

function openDirectory(directoryName, callback) {
	if (directoryName != '') {
		currentDirectory += (directoryName.replace('and', '&') + '/');
	}
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
		fileSystem.root.getDirectory('/.fileexplorer/' + currentDirectory, {
			create: true,
			exclusive: false
		}, function(directory) {
			callback(directory);
		}, failure);
	}, failure);
}

function openParentDirectory(callback) {
	var path = currentDirectory.split('/');
	currentDirectory = '';
	for (i = 0; i < path.length - 2; i++) {
		currentDirectory += path[i] + '/';
	}
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
		fileSystem.root.getDirectory('/.fileexplorer/' + currentDirectory, {
			create: true,
			exclusive: false
		}, function(directory) {
			callback(directory);
		}, failure);
	}, failure);
}

function displayDirectory(directory) {
	$('nav span').css('opacity', '0');
	setTimeout(function() {
		if (currentDirectory == '') {
			$('nav span').html('Documents');
		}
		else {
			var path = currentDirectory.split('/');
			$('nav span').html(path[path.length - 2]);
		}
		$('nav span').css('opacity', '1');
	}, 125);
	$('section').hide('fast', function() {
		$('section div div').remove();
		var directoryReader = directory.createReader();
		directoryReader.readEntries(function(entries) {
			entries.sort(function(a, b) {
				return (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
			});
			fileURLs = {};
			for (i = 0; i < entries.length; i++) {
				$('section div#' + (entries[i].isFile ? 'files' : 'directories')).append('<div>' + entries[i].name.replace('&', 'and') + '</div>');
				if (entries[i].isFile) {
					fileURLs[encodeURI(entries[i].name.replace('&', 'and'))] = entries[i].toURL();
				}
			}
			$('section div#directories div').click(function() {
				openDirectory($(this).html(), displayDirectory);
			});
			$('section div#files div').click(function() {
				window.plugins.ChildBrowser.showWebPage(fileURLs[encodeURI($(this).html())], {
					showLocationBar: true,
					showAddress: false,
					showNavigationBar: true
				});
			});
			$('section').show('fast');
		}, failure);
	});
}

function failure(error) {
	alert('Error occurred - please restart the app');
}

document.addEventListener('deviceready', function() {
	window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
	openDirectory('', displayDirectory);
	$('a#sync').click(function() {
		$('div#overlay').fadeIn('fast');
		$('div#overlay div#progress div').css('width', '0');
		$('div#overlay div#progress').show('fast');
		currentDirectory = '';
		openDirectory('', function(directory) {
			directory.removeRecursively(function() {
				displayDirectory(directory);
				var fileTransfer = new FileTransfer();
				fileTransfer.onprogress = function(progressEvent) {
					$('div#overlay div#progress div').css('width', ((progressEvent.loaded / progressEvent.total) * 100) + '%');
				}
				fileTransfer.download(encodeURI('https://www.dropbox.com/s/6x0mxruytwbzh3q/iCookBook.zip?raw=1'), directory.toURL() + '/download.zip', function(entry) {
					$('div#overlay div#progress div').css('width', '0');
					zip.unzip(entry.toURL(), directory.toURL(), function(error) {
						if (error != -1) {
							entry.remove(function() {
								$('div#overlay div#progress').hide('fast');
								$('div#overlay').fadeOut('fast');
								displayDirectory(directory);
							}, failure);
						}
						else {
							failure();
						}
					}, function(progressEvent) {
						$('div#overlay div#progress div').css('width', Math.round((progressEvent.loaded / progressEvent.total) * 100) + '%');
					});
				}, failure, true);
			}, failure);
		});
	});
	$('a#back').click(function() {
		if (currentDirectory != '') {
			openParentDirectory(displayDirectory);
		}
	});
}, false);
