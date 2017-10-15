var urlList = [];

$(document).ready(function() {

	$('#frmUploader #btnSubmit').on('click', downloadFileToServer);
});

function downloadFileToServer() {}
	
	$.getJSON('urlList', function(data) {

		urlList = data;
        console.log(data);
});

function showUserInfo(event) {

    // Prevent Link from Firing
    event.preventDefault();

    // Retrieve username from link rel attribute
    var thisUserName = $(this).attr('rel');

    // Get Index of object based on id value
    var arrayPosition = userListData.map(function(arrayItem) { return arrayItem.username; }).indexOf(thisUserName);

    // Get our User Object
    var thisUserObject = userListData[arrayPosition];

    //Populate Info Box
    $('#userInfoName').text(thisUserObject.fullname);
    $('#userInfoAge').text(thisUserObject.age);
    $('#userInfoGender').text(thisUserObject.gender);
    $('#userInfoLocation').text(thisUserObject.location);

};

/*function addUser(event) {
    event.preventDefault();

    // Super basic validation - increase errorCount variable if any fields are blank
    var errorCount = 0;
    $('#addUser input').each(function(index, val) {
        if($(this).val() === '') { errorCount++; }
    });

    // Check and make sure errorCount's still at zero
    if(errorCount === 0) {

        // If it is, compile all user info into one object
        var newUser = {
            'username': $('#addUser fieldset input#inputUserName').val(),
            'email': $('#addUser fieldset input#inputUserEmail').val(),
            'fullname': $('#addUser fieldset input#inputUserFullname').val(),
            'age': $('#addUser fieldset input#inputUserAge').val(),
            'location': $('#addUser fieldset input#inputUserLocation').val(),
            'gender': $('#addUser fieldset input#inputUserGender').val()
        }

        // Use AJAX to post the object to our adduser service
        $.ajax({
            type: 'POST',
            data: newUser,
            url: '/users/adduser',
            dataType: 'JSON'
        }).done(function( response ) {

            // Check for successful (blank) response
            if (response.msg === '') {

                // Clear the form inputs
                $('#addUser fieldset input').val('');

                // Update the table
                populateTable();

            }
            else {

                // If something goes wrong, alert the error message that our service returned
                alert('Error: ' + response.msg);

            }
        });
    }
    else {
        // If errorCount is more than 0, error out
        alert('Please fill in all fields');
        return false;
    }
};*/

function addUser(event) {

	event.preventDefault();
	var leaveFunction = false

	$('#addUser input').each(function(index, val) {
		if($(this).val() === '') {
			alert("Please fill in all the fields");
			leaveFunction = true;
			return false;
		}
	});

	if(leaveFunction) {
		return false;
	} else {
		var new_user = {
			'username': $('#addUser fieldset input#inputUserName').val(),
		    'email': $('#addUser fieldset input#inputUserEmail').val(),
		    'fullname': $('#addUser fieldset input#inputUserFullname').val(),
		    'age': $('#addUser fieldset input#inputUserAge').val(),
		    'location': $('#addUser fieldset input#inputUserLocation').val(),
		    'gender': $('#addUser fieldset input#inputUserGender').val()
		}

		$.ajax({
			type: 'POST',
			data: new_user,
			url: '/users/addUser',
			dataType: 'JSON'
		}).done(function(response) {
					if(response.msg === '') {
						$('#addUser fieldset input').val('');
						populateTable();
					} else {
						alert("Error:" + response.msg);
					}
		});
	}

};
