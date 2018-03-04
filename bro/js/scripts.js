$('#gmail-cur-end').datetimepicker({format: 'DD/MM/YYYY'});
$('#gmail-cur-start').datetimepicker({format: 'DD/MM/YYYY'});
$('#gmail-cur-details').hide();

var _serverprod = "http://heatcomplete.corp.ir2.yahoo.com:9000";
var _servertest = "http://heatcomplete.corp.ir2.yahoo.com:7000";

var _googleAuth;
var _userEmail;
var _userGivenName;

function googleSignIn(googleUser) {
  	_googleAuth = googleUser.getAuthResponse();
  	_userEmail = googleUser.getBasicProfile().getEmail();
  	_userGivenName = googleUser.getBasicProfile().getGivenName();

  	$('#div_google_signin').html('Currently signed in to Google as ' + _userEmail + '. <a href=\"#\" onclick=\"googleSignOut();\">Change user</a>.');
  	$('#a_slack_oauth').attr('href', $('#a_slack_oauth').attr('href') + '&state=' + _userEmail).show();

  	gmailGetVac({googleAuth: _googleAuth, userEmail: _userEmail});
  	gcalGetCalendars({googleAuth: _googleAuth, userEmail: _userEmail});

  	console.log(_googleAuth);

  	// $('#p_gmail_most_contacted > a').click({googleAuth: googleAuth, googleUser: googleUser, userEmail: userEmail}, gmailGetMostContacted);
  	// $('#p_gcal_calendars > a').click({googleAuth: googleAuth, userEmail: userEmail}, gcalGetCalendars);

  	slackSignIn(_userEmail);
}

function googleSignOut() {
  	gapi.auth2.getAuthInstance().signOut().then(function () {
    	location.reload();
  	});
}

function gmailGetVac(eventData){
	$('#gmail-cur-details').show();
  	$('#gmail-cur-loading').show();
  	
  	$.ajax({
    	url: _serverprod + '/gmail_vac',
    	data: {
      		userEmail: eventData.userEmail,
      		accessToken: eventData.googleAuth.access_token
    	},
    	statusCode : {
    		200: function(response){ 
			  	$('#gmail-cur-loading').hide();
			  	var resp = JSON.parse(JSON.stringify(response));

			  	updateGmailUI(resp);

			  	// $('#gmail-cur-json').html(JSON.stringify(response));
    		},
    		400: function(response){ 
    			$('#alertbox').show();
	    		$('#alertmsg').html(response.responseText);
    		}
    	}
  	});
}

function formattedTime(unixTimestamp, format){
	var dateString = moment.unix(unixTimestamp / 1000).format(format)
	return dateString;
}

$('#gmail-update').click(function(){
	// gather data from gmail form.

	var gmail = {};

	gmail.accessToken = _googleAuth.access_token;

	if($('#gmail-cur-enabled').is(':checked')) { 
		gmail.enableAutoReply = true;
	} else {
		gmail.enableAutoReply = false
	}

	gmail.startTime = moment($('#gmail-cur-start-input').val() + '00:00', "DD/MM/YYYY HH:mm").valueOf();

	// adding 60000 so that google sets the right day
	gmail.endTime = moment($('#gmail-cur-end-input').val() + '23:59', "DD/MM/YYYY HH:mm").valueOf() + 60000;

	gmail.responseBodyPlainText = $('#gmail-cur-response').val();
	gmail.responseSubject = $('#gmail-cur-subject').val();

	if($('#gmail-cur-restrictcontacts').prop('checked')){
		gmail.restrictToContacts = true;
	} else {
		gmail.restrictToContacts = false;
	}

	if($('#gmail-cur-restrictdomain').prop('checked')){
		gmail.restrictToDomain = true;
	} else {
		gmail.restrictToDomain = false;
	}
	
	gmail.userEmail = _userEmail;

	$.ajax({
    	url: _serverprod + '/gmail_vac',
    	type: 'PUT',
    	data: JSON.stringify(gmail),
    	contentType: 'application/json',
    	dataType: 'json',
    	statusCode: {
    		200: function(response){ 
	    		$('#alertbox').show();
	    		$('#alertmsg').html('Successfully updated Gmail OOO');
    		},
    		400: function(response){
    			$('#alertbox').show();
	    		$('#alertmsg').html(response.responseText);
	    		console.log(response);
    		}
    	}
  	});

	console.log(gmail);
});

function updateGmailUI(resp){
	if(resp.enableAutoReply){
		$('#gmail-cur-enabled').prop("checked", true);
		$('#gmail-cur-disabled').prop("checked", false);
	} else {
		$('#gmail-cur-enabled').prop("checked", false);
		$('#gmail-cur-disabled').prop("checked", true);
	}

	if(resp.responseSubject){
		$('#gmail-cur-subject').val(resp.responseSubject);
	} else {
		$('#gmail-cur-subject').val("");
	}

	// can also be html, so will need to check for that later
	if(resp.responseBodyPlainText){
		$('#gmail-cur-response').val(resp.responseBodyPlainText);
	} else {
		$('#gmail-cur-response').val("");
	}

	if(resp.restrictToContacts){
		$('#gmail-cur-restrictcontacts').prop("checked", true);
	} else {
		$('#gmail-cur-restrictcontacts').prop("checked", false);
	}

	if(resp.restrictToDomain){
		$('#gmail-cur-restrictdomain').prop("checked", true);
	} else {
		$('#gmail-cur-restrictdomain').prop("checked", false);
	}

	console.log("resp.startTime", resp.startTime);
	console.log("resp.endTime", resp.endTime);

	$('#gmail-cur-start-input').val(formattedTime(resp.startTime, 'DD/MM/YYYY'));
	$('#gmail-cur-end-input').val(formattedTime(resp.endTime - 1, 'DD/MM/YYYY'));

}

function gcalGetCalendars(eventData){

	$('#gcal-cur-details').show();
  	$('#gcal-cur-cals-loading').show();

  	$('#gcal-event-name').val(_userGivenName + " OOO");
  	
  	$.ajax({
    	url: _serverprod + '/gcal_calendars',
    	data: {
      		userEmail: eventData.userEmail,
      		accessToken: eventData.googleAuth.access_token
    	},
    	statusCode : {
    		200: function(response){ 
			  	$('#gcal-cur-cals-loading').hide();

			  	var ul = $('#gcal-cur-cals');

			  	for(var i = 0; i < response.length; i++){
			  		var cal = $('<div>')
			  			.addClass('form-check')
			  			.append('<input class="form-check-input" type="checkbox" name="gcal-cur-cal-'+ response[i].id+'" id="gcal-cur-cal-'+ response[i].id+'">')
			  			.append('<label class="form-check-label" for="gmail-cur-cal-'+ response[i].id+'">'+ response[i].summary+'</label>');

			  		if(response[i].primary){
			  		  	cal.children('input').prop('checked', true);
			  		  	cal.children('input').prop('value', 'primary');
			  		}

			  		ul.append(cal);
			  	}
    		},
    		400: function(response){ 
    			$('#alertbox').show();
	    		$('#alertmsg').html(response.responseText);
    		}
    	}
  	});
}

function gcalGetEvents(eventData){
  	$('#gcal-cur-events-loading').show();

  	$('.cal').removeClass('active');
  	$(this).toggleClass('active');

  	$.ajax({
    	url: _serverprod + '/gcal_events',
    	data: {
      		userEmail: eventData.data.userEmail,
      		accessToken: eventData.data.googleAuth.access_token,
      		calendarId: eventData.data.calendarID
    	},
    	statusCode : {
    		200: function(response){ 
			  	var resp;

			  	$('#gcal-cur-events-loading').hide();

			  	var ul = $('#gcal-cur-events');

			  	ul.empty();

			  	for(var i = 0; i < response.length; i++){
			  		resp = JSON.parse(JSON.stringify(response[i]));
			  	  	ul.append($('<li class="list-group-item">').html('<p>' + resp.summary +'</p>'));
			  	}
    		},
    		400: function(response){ 
    			$('#alertbox').show();
	    		$('#alertmsg').html(response.responseText);
    		}
    	}
    });
}

function createCalEvent(calid, transparency, data){
	var gcal = {};
	gcal.accessToken = data.accessToken;
	gcal.userEmail = data.userEmail;
	gcal.summary = data.summary;
	gcal.visibility = data.visibility;
	gcal.calendarId = calid;
	gcal.endDateTime = data.endDateTime;
	gcal.startDateTime = data.startDateTime
	gcal.transparency = transparency;

	// server call

	$.ajax({
    	url: _serverprod + '/gcal_event',
    	type: 'POST',
    	data: JSON.stringify(gcal),
    	contentType: 'application/json',
    	dataType: 'json',
    	statusCode: {
    		200: function(response){ 
	    		$('#alertbox').show();
	    		$('#alertmsg').html('Successfully updated gcal events');
    		},
    		400: function(response){
    			$('#alertbox').show();
	    		$('#alertmsg').html(response.responseText);
    		}
    	}
  	});

	console.log(gcal);

}

$('#gcal-update').click(function(){

	var data = {};

	data.accessToken = _googleAuth.access_token;
	data.userEmail = _userEmail;

	data.summary = $('#gcal-event-name').val();
	data.visibility = $('input[name=visibility]:checked').val();

	// format: 2018-01-25T00:00:00Z

	// DD/MM/YYYY
	
	data.endDateTime = moment($('#gmail-cur-end-input').val(), "DD/MM/YYYY").format("YYYY-MM-DDT00:00:00[Z]")
	data.startDateTime = moment($('#gmail-cur-start-input').val(), "DD/MM/YYYY").format("YYYY-MM-DDT00:00:00[Z]")

	var calTicks = $('#gcal-cur-cals').children().children('input');

	for (var i = calTicks.length - 1; i >= 0; i--) {

		if(calTicks[i].checked){
			// get the id of the cals in an array

			var transparency = 'transparent';

			// if calendar is default, set busy, otherwise set available

			if(calTicks[i].value == "primary"){
				transparency = 'opaque';
			}

			var str = calTicks[i].id;
			var res = str.split("gcal-cur-cal-");
			createCalEvent(res[1], transparency, data)
		}
	}
});

function slackSignIn(userEmail){
  	$.ajax({
    	url: _serverprod + '/slack_token',
    	data: {
      		userEmail: userEmail
    	},
    	statusCode : {
    		200: function(response){ 
			  	if(response && response.length > 1){
		    		$('#slack-cur-details').show();
		    		$('#a_slack_oauth').hide();

		    		slackGetStatus({token: response, userEmail: _userEmail});
		    		slackGetDnd({token: response, userEmail: _userEmail});

		  		}
		  		else{
		    		$('#a_slack_oauth').show();
				}
    		},
    		400: function(response){ 
    			$('#alertbox').show();
	    		$('#alertmsg').html(response.responseText);
    		}
    	}
	});
}

function slackGetStatus(eventData){
  	$('#slack-status-loading').show();
  	$.ajax({
  		url: _serverprod + '/slack_status',
    	data: {
      		userEmail: eventData.userEmail,
      		accessToken: eventData.token
    	},
    	statusCode : {
    		200: function(response){ 
			  	var resp = JSON.parse(JSON.stringify(response));
      			$('#slack-cur-status-json').html(JSON.stringify(response));
      			$('#slack-status-loading').hide();

      			$('#slack-cur-status').val(resp.text);
      			$('#slack-cur-emoji').val(resp.emoji);
    		},
    		400: function(response){ 
    			$('#alertbox').show();
	    		$('#alertmsg').html(response.responseText);
    		}
    	}
  	});
}

function slackGetDnd(eventData){
  	$('#slack-dnd-loading').show();
  	$.ajax({
		url: _serverprod + '/slack_dnd',
		data: {
  			userEmail: eventData.userEmail,
  			accessToken: eventData.token
		},
		statusCode : {
    		200: function(response){ 
  				$('#slack-cur-dnd-json').html(JSON.stringify(response));
  				$('#slack-dnd-loading').hide();

  				var resp = JSON.parse(JSON.stringify(response));

  				console.log(resp);

  				if(resp.dnd_enabled){
  					$('#slack-dnd-status').prop("checked", true);
  				} else {
  					$('#slack-dnd-status').prop("checked", false);
  				}
  				
  				if(resp.snooze_enabled){
  					$('#slack-dnd-snooze').prop("checked", true);
  				} else {
  					$('#slack-dnd-snooze').prop("checked", false);
  				}

  				$('#slack-dnd-status').val(resp.dnd_enabled.toString());
      			$('#slack-dnd-snooze').val(resp.snooze_enabled.toString());

    		},
    		400: function(response){ 
    			$('#alertbox').show();
	    		$('#alertmsg').html(response.responseText);
    		}
    	}
  	});
}

$('#slack-update').click(function(){
	var slack = {};

	slack.status = $('#slack-cur-status').val();
	slack.emoji = $('#slack-cur-emoji').val();
	slack.dndStatus = $('#slack-dnd-status').val();
	slack.dndSnooze = $('#slack-dnd-snooze').val();

	console.log(slack);
});


// function gmailGetMostContacted(eventData){
//   if(eventData.data.googleUser.hasGrantedScopes('https://www.googleapis.com/auth/gmail.readonly')){
//     $('#p_gmail_most_contacted').html('Loading...');
//     $.ajax({
//       url: 'https://heatcomplete.corp.ir2.yahoo.com:7000/gmail_get_most_contacted',
//       data: {
//         userEmail: eventData.data.userEmail,
//         accessToken: eventData.data.googleAuth.access_token,
//         token_type: eventData.data.googleAuth.token_type,
//         expiry_date: eventData.data.googleAuth.expires_at
//       },
//       success: function(response){
//         var ol = $('<ol>');
//         for(var i = 0; i < response.length; i++){
//           ol.append($("<li>").html(JSON.stringify(response[i])));
//         }
//         $('#p_gmail_most_contacted').html(ol);
//       }
//     });
//   }
//   else{
//     eventData.data.googleUser.grant({scope: 'https://www.googleapis.com/auth/gmail.readonly'}).then(function () {
//       location.reload();
//     });
//   }
// }






