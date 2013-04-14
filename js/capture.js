
	var npath='';
/*	
	function sendform(){
		var options = new FileUploadOptions();
		options.fileKey="file";
		options.fileName=npath.substr(npath.lastIndexOf('/')+1);
		options.mimeType="image/jpeg";

		var nomimage = Math.floor(Math.random()*15000000);
		var ft = new FileTransfer();
		ft.upload(npath, upload_url + '?nomimage=' + nomimage , 
			successCallback,
			errorCallback,
		    options);
	}
*/	
	function capturePhoto() {
	    navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 50, targetWidth:600  });
	}

	function onFail(){
		var msg ='Impossible de lancer l\'appareil photo';
        navigator.notification.alert(msg, null, '');
	}

	function onPhotoDataSuccess(imageData) {
		alert(imageData); 
		// On récupère le chemin de la photo
		npath = imageData.replace("file://localhost",'');
		var path = imageData.replace("file://localhost",'');

		// On affiche la preview
		$('#myImage').attr('src', path);
		$('#myImage').show();
	}

	function deletePhoto(){
		$('#myImage').attr('src', '');
		$('#myImage').hide();
	}