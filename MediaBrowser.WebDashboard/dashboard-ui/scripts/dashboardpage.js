define(["datetime","jQuery","events","dom","globalize","loading","connectionManager","playMethodHelper","libraryBrowser","cardBuilder","imageLoader","humanedate","listViewStyle","emby-linkbutton","flexStyles","buttonenabled","emby-button","emby-itemscontainer"],function(datetime,$,events,dom,globalize,loading,connectionManager,playMethodHelper,libraryBrowser,cardBuilder,imageLoader){"use strict";function onConnectionHelpClick(e){return e.preventDefault(),!1}function onEditServerNameClick(e){var page=dom.parentWithClass(this,"page");return require(["prompt"],function(prompt){prompt({label:globalize.translate("LabelFriendlyServerName"),description:globalize.translate("LabelFriendlyServerNameHelp"),value:page.querySelector(".serverNameHeader").innerHTML,confirmText:globalize.translate("ButtonSave")}).then(function(value){loading.show(),ApiClient.getServerConfiguration().then(function(config){config.ServerName=value,ApiClient.updateServerConfiguration(config).then(function(){page.querySelector(".serverNameHeader").innerHTML=value,loading.hide()})})})}),e.preventDefault(),!1}function showPlaybackInfo(btn,session){require(["alert"],function(alert){var showTranscodeReasons,title,text=[],displayPlayMethod=playMethodHelper.getDisplayPlayMethod(session),isDirectStream="DirectStream"===displayPlayMethod,isTranscode="Transcode"===displayPlayMethod;isDirectStream?(title=globalize.translate("sharedcomponents#DirectStreaming"),text.push(globalize.translate("sharedcomponents#DirectStreamHelp1")),text.push("<br/>"),text.push(globalize.translate("sharedcomponents#DirectStreamHelp2"))):isTranscode&&(title=globalize.translate("sharedcomponents#Transcoding"),text.push(globalize.translate("sharedcomponents#MediaIsBeingConverted")),session.TranscodingInfo&&session.TranscodingInfo.TranscodeReasons&&session.TranscodingInfo.TranscodeReasons.length&&(text.push("<br/>"),text.push(globalize.translate("sharedcomponents#LabelReasonForTranscoding")),showTranscodeReasons=!0)),showTranscodeReasons&&session.TranscodingInfo.TranscodeReasons.forEach(function(t){text.push(globalize.translate("sharedcomponents#"+t))}),alert({text:text.join("<br/>"),title:title})})}function showSendMessageForm(btn,session){require(["prompt"],function(prompt){prompt({title:globalize.translate("HeaderSendMessage"),label:globalize.translate("LabelMessageText"),confirmText:globalize.translate("ButtonSend")}).then(function(text){if(text){var apiClient=connectionManager.getApiClient(session.ServerId);apiClient.sendMessageCommand(session.Id,{Text:text,TimeoutMs:5e3})}})})}function showOptionsMenu(btn,session){require(["actionsheet"],function(actionsheet){var menuItems=[];return session.ServerId&&session.DeviceId!==connectionManager.deviceId()&&menuItems.push({name:globalize.translate("SendMessage"),id:"sendmessage"}),session.TranscodingInfo&&session.TranscodingInfo.TranscodeReasons&&session.TranscodingInfo.TranscodeReasons.length&&menuItems.push({name:globalize.translate("ViewPlaybackInfo"),id:"transcodinginfo"}),actionsheet.show({items:menuItems,positionTo:btn}).then(function(id){switch(id){case"sendmessage":showSendMessageForm(btn,session);break;case"transcodinginfo":showPlaybackInfo(btn,session)}})})}function onActiveDevicesClick(e){var btn=dom.parentWithClass(e.target,"sessionCardButton");if(btn){var card=dom.parentWithClass(btn,"card");if(card){var sessionId=card.id,session=(DashboardPage.sessionsList||[]).filter(function(s){return"session"+s.Id===sessionId})[0];session&&(btn.classList.contains("btnCardOptions")?showOptionsMenu(btn,session):btn.classList.contains("btnSessionInfo")?showPlaybackInfo(btn,session):btn.classList.contains("btnSessionSendMessage")?showSendMessageForm(btn,session):btn.classList.contains("btnSessionStop")?connectionManager.getApiClient(session.ServerId).sendPlayStateCommand(session.Id,"Stop"):btn.classList.contains("btnSessionPlayPause")&&session.PlayState&&(session.PlayState.IsPaused?connectionManager.getApiClient(session.ServerId).sendPlayStateCommand(session.Id,"Unpause"):connectionManager.getApiClient(session.ServerId).sendPlayStateCommand(session.Id,"Pause")))}}}function filterSessions(sessions){for(var list=[],i=0,length=sessions.length;i<length;i++){var session=sessions[i];(session.NowPlayingItem||session.UserId)&&list.push(session)}return list}function dismissWelcome(page,userId){ApiClient.getDisplayPreferences("dashboard",userId,"dashboard").then(function(result){result.CustomPrefs[welcomeTourKey]=welcomeDismissValue,ApiClient.updateDisplayPreferences("dashboard",result,userId,"dashboard")})}function showWelcomeIfNeeded(page,apiClient){var userId=Dashboard.getCurrentUserId();apiClient.getDisplayPreferences("dashboard",userId,"dashboard").then(function(result){if(result.CustomPrefs[welcomeTourKey]==welcomeDismissValue)$(".welcomeMessage",page).hide();else{var elem=$(".welcomeMessage",page).show();result.CustomPrefs[welcomeTourKey]?($(".tourHeader",elem).html(globalize.translate("HeaderWelcomeBack")),$(".tourButtonText",elem).html(globalize.translate("ButtonTakeTheTourToSeeWhatsNew"))):($(".tourHeader",elem).html(globalize.translate("HeaderWelcomeToProjectServerDashboard")),$(".tourButtonText",elem).html(globalize.translate("ButtonTakeTheTour")))}})}function takeTour(page,userId){require(["slideshow"],function(){var slides=[{imageUrl:"css/images/tour/admin/dashboard.png",title:globalize.translate("DashboardTourDashboard")},{imageUrl:"css/images/tour/admin/help.png",title:globalize.translate("DashboardTourHelp")},{imageUrl:"css/images/tour/admin/users.png",title:globalize.translate("DashboardTourUsers")},{imageUrl:"css/images/tour/admin/sync.png",title:globalize.translate("DashboardTourSync")},{imageUrl:"css/images/tour/admin/cinemamode.png",title:globalize.translate("DashboardTourCinemaMode")},{imageUrl:"css/images/tour/admin/chapters.png",title:globalize.translate("DashboardTourChapters")},{imageUrl:"css/images/tour/admin/subtitles.png",title:globalize.translate("DashboardTourSubtitles")},{imageUrl:"css/images/tour/admin/plugins.png",title:globalize.translate("DashboardTourPlugins")},{imageUrl:"css/images/tour/admin/notifications.png",title:globalize.translate("DashboardTourNotifications")},{imageUrl:"css/images/tour/admin/scheduledtasks.png",title:globalize.translate("DashboardTourScheduledTasks")},{imageUrl:"css/images/tour/admin/mobile.png",title:globalize.translate("DashboardTourMobile")},{imageUrl:"css/images/tour/enjoy.jpg",title:globalize.translate("MessageEnjoyYourStay")}];require(["slideshow"],function(slideshow){var newSlideShow=new slideshow({slides:slides,interactive:!0,loop:!1});newSlideShow.show(),dismissWelcome(page,userId),$(".welcomeMessage",page).hide()})})}function refreshActiveRecordings(view,apiClient){apiClient.getLiveTvRecordings({UserId:Dashboard.getCurrentUserId(),IsInProgress:!0,Fields:"CanDelete,PrimaryImageAspectRatio",EnableTotalRecordCount:!1,EnableImageTypes:"Primary,Thumb,Backdrop"}).then(function(result){var itemsContainer=view.querySelector(".activeRecordingItems");if(!result.Items.length)return view.querySelector(".activeRecordingsSection").classList.add("hide"),void(itemsContainer.innerHTML="");view.querySelector(".activeRecordingsSection").classList.remove("hide");var cardLayout=!1;itemsContainer.innerHTML=cardBuilder.getCardsHtml({items:result.Items,shape:"auto",defaultShape:"backdrop",showTitle:!0,showParentTitle:!0,coverImage:!0,cardLayout:cardLayout,centerText:!cardLayout,preferThumb:"auto",overlayText:!1,overlayMoreButton:!0,action:"none",centerPlayButton:!0}),imageLoader.lazyChildren(itemsContainer)})}window.DashboardPage={newsStartIndex:0,renderPaths:function(page,systemInfo){$("#cachePath",page).html(systemInfo.CachePath),$("#logPath",page).html(systemInfo.LogPath),$("#transcodingTemporaryPath",page).html(systemInfo.TranscodingTempPath),$("#metadataPath",page).html(systemInfo.InternalMetadataPath)},refreshSessionsLocally:function(){var list=DashboardPage.sessionsList;list&&DashboardPage.renderActiveConnections($.mobile.activePage,list)},reloadSystemInfo:function(page){ApiClient.getSystemInfo().then(function(systemInfo){page.querySelector(".serverNameHeader").innerHTML=systemInfo.ServerName;var localizedVersion=globalize.translate("LabelVersionNumber",systemInfo.Version);systemInfo.SystemUpdateLevel&&"Release"!=systemInfo.SystemUpdateLevel&&(localizedVersion+=" "+globalize.translate("Option"+systemInfo.SystemUpdateLevel).toLowerCase()),systemInfo.CanSelfRestart?$(".btnRestartContainer",page).removeClass("hide"):$(".btnRestartContainer",page).addClass("hide"),$("#appVersionNumber",page).html(localizedVersion),systemInfo.SupportsHttps?$("#ports",page).html(globalize.translate("LabelRunningOnPorts",systemInfo.HttpServerPortNumber,systemInfo.HttpsPortNumber)):$("#ports",page).html(globalize.translate("LabelRunningOnPort",systemInfo.HttpServerPortNumber)),DashboardPage.renderUrls(page,systemInfo),DashboardPage.renderPendingInstallations(page,systemInfo),systemInfo.CanSelfUpdate?($("#btnUpdateApplicationContainer",page).show(),$("#btnManualUpdateContainer",page).hide()):($("#btnUpdateApplicationContainer",page).hide(),$("#btnManualUpdateContainer",page).show()),"synology"==systemInfo.PackageName?$("#btnManualUpdateContainer").html(globalize.translate("SynologyUpdateInstructions")):$("#btnManualUpdateContainer").html('<a href="http://emby.media/download" target="_blank">'+globalize.translate("PleaseUpdateManually")+"</a>"),DashboardPage.renderPaths(page,systemInfo),DashboardPage.renderHasPendingRestart(page,systemInfo.HasPendingRestart)})},reloadNews:function(page){var query={StartIndex:DashboardPage.newsStartIndex,Limit:4};ApiClient.getProductNews(query).then(function(result){var html=result.Items.map(function(item){var itemHtml="";itemHtml+='<a class="clearLink" href="'+item.Link+'" target="_blank">',itemHtml+='<div class="listItem listItem-noborder">',itemHtml+='<i class="listItemIcon md-icon">dvr</i>',itemHtml+='<div class="listItemBody two-line">',itemHtml+='<div class="listItemBodyText">',itemHtml+=item.Title,itemHtml+="</div>",itemHtml+='<div class="listItemBodyText secondary">';var date=datetime.parseISO8601Date(item.Date,!0);return itemHtml+=datetime.toLocaleDateString(date),itemHtml+="</div>",itemHtml+="</div>",itemHtml+="</div>",itemHtml+="</a>"}),pagingHtml="";pagingHtml+="<div>",pagingHtml+=libraryBrowser.getQueryPagingHtml({startIndex:query.StartIndex,limit:query.Limit,totalRecordCount:result.TotalRecordCount,showLimit:!1,updatePageSizeSetting:!1}),pagingHtml+="</div>",html=html.join("")+pagingHtml;var elem=$(".latestNewsItems",page).html(html);$(".btnNextPage",elem).on("click",function(){DashboardPage.newsStartIndex+=query.Limit,DashboardPage.reloadNews(page)}),$(".btnPreviousPage",elem).on("click",function(){DashboardPage.newsStartIndex-=query.Limit,DashboardPage.reloadNews(page)})})},startInterval:function(apiClient){apiClient.isWebSocketOpen()&&(apiClient.sendWebSocketMessage("SessionsStart","0,1500"),apiClient.sendWebSocketMessage("ScheduledTasksInfoStart","0,1000"))},stopInterval:function(apiClient){apiClient.isWebSocketOpen()&&(apiClient.sendWebSocketMessage("SessionsStop"),apiClient.sendWebSocketMessage("ScheduledTasksInfoStop"))},onWebSocketMessage:function(e,msg){var page=$($.mobile.activePage)[0];if("Sessions"==msg.MessageType)DashboardPage.renderInfo(page,msg.Data);else if("RestartRequired"==msg.MessageType)DashboardPage.renderHasPendingRestart(page,!0);else if("ServerShuttingDown"==msg.MessageType)DashboardPage.renderHasPendingRestart(page,!0);else if("ServerRestarting"==msg.MessageType)DashboardPage.renderHasPendingRestart(page,!0);else if("ScheduledTasksInfo"==msg.MessageType){var tasks=msg.Data;DashboardPage.renderRunningTasks(page,tasks)}else"PackageInstalling"!=msg.MessageType&&"PackageInstallationCompleted"!=msg.MessageType||(DashboardPage.pollForInfo(page,!0),DashboardPage.reloadSystemInfo(page))},onWebSocketOpen:function(){var apiClient=this;DashboardPage.startInterval(apiClient)},pollForInfo:function(page,forceUpdate){var apiClient=window.ApiClient;apiClient&&(apiClient.getSessions().then(function(sessions){DashboardPage.renderInfo(page,sessions,forceUpdate)}),apiClient.getScheduledTasks().then(function(tasks){DashboardPage.renderRunningTasks(page,tasks)}))},renderInfo:function(page,sessions,forceUpdate){sessions=filterSessions(sessions),DashboardPage.renderActiveConnections(page,sessions),DashboardPage.renderPluginUpdateInfo(page,forceUpdate),loading.hide()},renderActiveConnections:function(page,sessions){var html="";DashboardPage.sessionsList=sessions;var parentElement=page.querySelector(".activeDevices");$(".card",parentElement).addClass("deadSession");for(var i=0,length=sessions.length;i<length;i++){var session=sessions[i],rowId="session"+session.Id,elem=page.querySelector("#"+rowId);if(elem)DashboardPage.updateSession(elem,session);else{var nowPlayingItem=session.NowPlayingItem,className="scalableCard card activeSession backdropCard backdropCard-scalable";session.TranscodingInfo&&session.TranscodingInfo.CompletionPercentage&&(className+=" transcodingSession"),html+='<div class="'+className+'" id="'+rowId+'">',html+='<div class="cardBox visualCardBox">',html+='<div class="cardScalable visualCardBox-cardScalable">',html+='<div class="cardPadder cardPadder-backdrop"></div>',html+='<div class="cardContent">';var imgUrl=DashboardPage.getNowPlayingImageUrl(nowPlayingItem);imgUrl?(html+='<div class="sessionNowPlayingContent sessionNowPlayingContent-withbackground"',html+=' data-src="'+imgUrl+'" style="display:inline-block;background-image:url(\''+imgUrl+"');\""):html+='<div class="sessionNowPlayingContent"',html+="></div>",html+='<div class="sessionNowPlayingInnerContent">',html+='<div class="sessionAppInfo">';var clientImage=DashboardPage.getClientImage(session);clientImage&&(html+=clientImage),html+='<div class="sessionAppName" style="display:inline-block;">',html+='<div class="sessionDeviceName">'+session.DeviceName+"</div>",html+='<div class="sessionAppSecondaryText">'+DashboardPage.getAppSecondaryText(session)+"</div>",html+="</div>",html+="</div>",html+='<div class="sessionNowPlayingTime">'+DashboardPage.getSessionNowPlayingTime(session)+"</div>",html+=session.TranscodingInfo&&session.TranscodingInfo.Framerate?'<div class="sessionTranscodingFramerate">'+session.TranscodingInfo.Framerate+" fps</div>":'<div class="sessionTranscodingFramerate"></div>';var nowPlayingName=DashboardPage.getNowPlayingName(session);if(html+='<div class="sessionNowPlayingInfo" data-imgsrc="'+nowPlayingName.image+'">',html+=nowPlayingName.html,html+="</div>",nowPlayingItem&&nowPlayingItem.RunTimeTicks){var position=session.PlayState.PositionTicks||0,value=100*position/nowPlayingItem.RunTimeTicks;html+='<progress class="playbackProgress" min="0" max="100" value="'+value+'"></progress>'}else html+='<progress class="playbackProgress" min="0" max="100" style="display:none;"></progress>';html+=session.TranscodingInfo&&session.TranscodingInfo.CompletionPercentage?'<progress class="transcodingProgress" min="0" max="100" value="'+session.TranscodingInfo.CompletionPercentage.toFixed(1)+'"></progress>':'<progress class="transcodingProgress hide" min="0" max="100"></progress>',html+="</div>",html+="</div>",html+="</div>",html+='<div class="sessionCardFooter cardFooter">',html+='<div class="sessionCardButtons flex align-items-center justify-content-center">';var btnCssClass;btnCssClass=session.ServerId&&session.NowPlayingItem&&session.SupportsRemoteControl&&session.DeviceId!==connectionManager.deviceId()?"":" hide",html+='<button is="paper-icon-button-light" class="sessionCardButton btnSessionPlayPause paper-icon-button-light '+btnCssClass+'"><i class="md-icon">&#xE034;</i></button>',html+='<button is="paper-icon-button-light" class="sessionCardButton btnSessionStop paper-icon-button-light '+btnCssClass+'"><i class="md-icon">&#xE047;</i></button>',btnCssClass=session.TranscodingInfo&&session.TranscodingInfo.TranscodeReasons&&session.TranscodingInfo&&session.TranscodingInfo.TranscodeReasons.length?"":" hide",html+='<button is="paper-icon-button-light" class="sessionCardButton btnSessionInfo paper-icon-button-light '+btnCssClass+'" title="'+globalize.translate("ViewPlaybackInfo")+'"><i class="md-icon">&#xE88E;</i></button>',btnCssClass=session.ServerId&&session.SupportedCommands.indexOf("DisplayMessage")!==-1&&session.DeviceId!==connectionManager.deviceId()?"":" hide",html+='<button is="paper-icon-button-light" class="sessionCardButton btnSessionSendMessage paper-icon-button-light '+btnCssClass+'" title="'+globalize.translate("SendMessage")+'"><i class="md-icon">&#xE0C9;</i></button>',html+="</div>",html+='<div class="sessionNowPlayingStreamInfo" style="padding:.5em 0 1em;">',html+=DashboardPage.getSessionNowPlayingStreamInfo(session),html+="</div>",html+='<div class="flex align-items-center justify-content-center">';var userImage=DashboardPage.getUserImage(session);html+=userImage?'<img style="height:1.71em;border-radius:50px;margin-right:.5em;" src="'+userImage+'" />':'<div style="height:1.71em;"></div>',html+='<div class="sessionUserName" style="text-transform:uppercase;">',html+=DashboardPage.getUsersHtml(session)||"&nbsp;",html+="</div>",html+="</div>",html+="</div>",html+="</div>",html+="</div>"}}parentElement.insertAdjacentHTML("beforeend",html),$(".deadSession",parentElement).remove()},getSessionNowPlayingStreamInfo:function(session){var html="",showTranscodingInfo=!1,showMoreInfoButton=!1,displayPlayMethod=playMethodHelper.getDisplayPlayMethod(session);if("DirectStream"===displayPlayMethod?(html+=globalize.translate("sharedcomponents#DirectStreaming"),showMoreInfoButton=!0):"Transcode"==displayPlayMethod?(html+=globalize.translate("sharedcomponents#Transcoding"),session.TranscodingInfo&&session.TranscodingInfo.Framerate&&(html+=" ("+session.TranscodingInfo.Framerate+" fps)"),showTranscodingInfo=!0,showMoreInfoButton=!0):"DirectPlay"==displayPlayMethod&&(html+=globalize.translate("sharedcomponents#DirectPlaying")),showTranscodingInfo){var line=[];session.TranscodingInfo&&(session.TranscodingInfo.Bitrate&&(session.TranscodingInfo.Bitrate>1e6?line.push((session.TranscodingInfo.Bitrate/1e6).toFixed(1)+" Mbps"):line.push(Math.floor(session.TranscodingInfo.Bitrate/1e3)+" kbps")),session.TranscodingInfo.Container&&line.push(session.TranscodingInfo.Container),session.TranscodingInfo.VideoCodec&&line.push(session.TranscodingInfo.VideoCodec),session.TranscodingInfo.AudioCodec&&session.TranscodingInfo.AudioCodec!=session.TranscodingInfo.Container&&line.push(session.TranscodingInfo.AudioCodec)),line.length&&(html+=" - "+line.join(" "))}return html||"&nbsp;"},getSessionNowPlayingTime:function(session){var nowPlayingItem=session.NowPlayingItem,html="";return nowPlayingItem?(html+=session.PlayState.PositionTicks?datetime.getDisplayRunningTime(session.PlayState.PositionTicks):"--:--:--",html+=" / ",html+=nowPlayingItem&&nowPlayingItem.RunTimeTicks?datetime.getDisplayRunningTime(nowPlayingItem.RunTimeTicks):"--:--:--"):html},getAppSecondaryText:function(session){return session.Client+" "+session.ApplicationVersion},getNowPlayingName:function(session){var imgUrl="",nowPlayingItem=session.NowPlayingItem;if(!nowPlayingItem)return{html:"Last seen "+humane_date(session.LastActivityDate),image:imgUrl};var topText=nowPlayingItem.Name,bottomText="";nowPlayingItem.Artists&&nowPlayingItem.Artists.length?(bottomText=topText,topText=nowPlayingItem.Artists[0]):nowPlayingItem.SeriesName||nowPlayingItem.Album?(bottomText=topText,topText=nowPlayingItem.SeriesName||nowPlayingItem.Album):nowPlayingItem.ProductionYear&&(bottomText=nowPlayingItem.ProductionYear),nowPlayingItem.ImageTags&&nowPlayingItem.ImageTags.Logo?imgUrl=ApiClient.getScaledImageUrl(nowPlayingItem.Id,{tag:nowPlayingItem.ImageTags.Logo,maxHeight:24,maxWidth:130,type:"Logo"}):nowPlayingItem.ParentLogoImageTag&&(imgUrl=ApiClient.getScaledImageUrl(nowPlayingItem.ParentLogoItemId,{tag:nowPlayingItem.ParentLogoImageTag,maxHeight:24,maxWidth:130,type:"Logo"})),imgUrl&&(topText='<img src="'+imgUrl+'" style="max-height:24px;max-width:130px;" />');var text=bottomText?topText+"<br/>"+bottomText:topText;return{html:text,image:imgUrl}},getUsersHtml:function(session){var html=[];session.UserId&&html.push(session.UserName);for(var i=0,length=session.AdditionalUsers.length;i<length;i++)html.push(session.AdditionalUsers[i].UserName);return html.join(", ")},getUserImage:function(session){return session.UserId&&session.UserPrimaryImageTag?ApiClient.getUserImageUrl(session.UserId,{tag:session.UserPrimaryImageTag,height:24,type:"Primary"}):null},updateSession:function(row,session){row.classList.remove("deadSession");var nowPlayingItem=session.NowPlayingItem;nowPlayingItem?row.classList.add("playingSession"):row.classList.remove("playingSession"),session.ServerId&&session.SupportedCommands.indexOf("DisplayMessage")!==-1&&session.DeviceId!==connectionManager.deviceId()?row.querySelector(".btnSessionSendMessage").classList.remove("hide"):row.querySelector(".btnSessionSendMessage").classList.add("hide"),session.TranscodingInfo&&session.TranscodingInfo.TranscodeReasons&&session.TranscodingInfo&&session.TranscodingInfo.TranscodeReasons.length?row.querySelector(".btnSessionInfo").classList.remove("hide"):row.querySelector(".btnSessionInfo").classList.add("hide");var btnSessionPlayPause=row.querySelector(".btnSessionPlayPause");session.ServerId&&nowPlayingItem&&session.SupportsRemoteControl&&session.DeviceId!==connectionManager.deviceId()?(btnSessionPlayPause.classList.remove("hide"),row.querySelector(".btnSessionStop").classList.remove("hide")):(btnSessionPlayPause.classList.add("hide"),row.querySelector(".btnSessionStop").classList.add("hide")),session.PlayState&&session.PlayState.IsPaused?btnSessionPlayPause.querySelector("i").innerHTML="&#xE037;":btnSessionPlayPause.querySelector("i").innerHTML="&#xE034;",row.querySelector(".sessionNowPlayingStreamInfo").innerHTML=DashboardPage.getSessionNowPlayingStreamInfo(session),row.querySelector(".sessionNowPlayingTime").innerHTML=DashboardPage.getSessionNowPlayingTime(session),row.querySelector(".sessionUserName").innerHTML=DashboardPage.getUsersHtml(session)||"&nbsp;",row.querySelector(".sessionAppSecondaryText").innerHTML=DashboardPage.getAppSecondaryText(session),row.querySelector(".sessionTranscodingFramerate").innerHTML=session.TranscodingInfo&&session.TranscodingInfo.Framerate?session.TranscodingInfo.Framerate+" fps":"";var nowPlayingName=DashboardPage.getNowPlayingName(session),nowPlayingInfoElem=row.querySelector(".sessionNowPlayingInfo");if(nowPlayingName.image&&nowPlayingName.image==nowPlayingInfoElem.getAttribute("data-imgsrc")||(nowPlayingInfoElem.innerHTML=nowPlayingName.html,nowPlayingInfoElem.setAttribute("data-imgsrc",nowPlayingName.image||"")),nowPlayingItem&&nowPlayingItem.RunTimeTicks){var position=session.PlayState.PositionTicks||0,value=100*position/nowPlayingItem.RunTimeTicks;$(".playbackProgress",row).show().val(value)}else $(".playbackProgress",row).hide();var transcodingProgress=row.querySelector(".transcodingProgress");session.TranscodingInfo&&session.TranscodingInfo.CompletionPercentage?(row.classList.add("transcodingSession"),transcodingProgress.value=session.TranscodingInfo.CompletionPercentage,transcodingProgress.classList.remove("hide")):(transcodingProgress.classList.add("hide"),row.classList.remove("transcodingSession"));var imgUrl=DashboardPage.getNowPlayingImageUrl(nowPlayingItem)||"",imgElem=row.querySelector(".sessionNowPlayingContent");imgUrl!=imgElem.getAttribute("data-src")&&(imgElem.style.backgroundImage=imgUrl?"url('"+imgUrl+"')":"",imgElem.setAttribute("data-src",imgUrl),imgUrl?imgElem.classList.add("sessionNowPlayingContent-withbackground"):imgElem.classList.remove("sessionNowPlayingContent-withbackground"))},getClientImage:function(connection){var clientLowered=connection.Client.toLowerCase(),device=connection.DeviceName.toLowerCase();if(connection.AppIconUrl)return"<img src='"+connection.AppIconUrl+"' />";if("dashboard"==clientLowered||"emby web client"==clientLowered){var imgUrl;return imgUrl=device.indexOf("chrome")!=-1?"css/images/clients/chrome.png":"css/images/clients/html5.png","<img src='"+imgUrl+"' alt='Emby Web Client' />"}return clientLowered.indexOf("android")!=-1?"<img src='css/images/clients/android.png' />":clientLowered.indexOf("ios")!=-1?"<img src='css/images/clients/ios.png' />":"mb-classic"==clientLowered?"<img src='css/images/clients/mbc.png' />":"roku"==clientLowered?"<img src='css/images/clients/roku.jpg' />":"dlna"==clientLowered?"<img src='css/images/clients/dlna.png' />":"kodi"==clientLowered||"xbmc"==clientLowered?"<img src='css/images/clients/kodi.png' />":"chromecast"==clientLowered?"<img src='css/images/clients/chromecast.png' />":null},getNowPlayingImageUrl:function(item){if(item&&item.BackdropImageTags&&item.BackdropImageTags.length)return ApiClient.getScaledImageUrl(item.Id,{type:"Backdrop",width:275,tag:item.BackdropImageTags[0]});if(item&&item.ParentBackdropImageTags&&item.ParentBackdropImageTags.length)return ApiClient.getScaledImageUrl(item.ParentBackdropItemId,{type:"Backdrop",width:275,tag:item.ParentBackdropImageTags[0]});if(item&&item.BackdropImageTag)return ApiClient.getScaledImageUrl(item.BackdropItemId,{type:"Backdrop",width:275,tag:item.BackdropImageTag});var imageTags=(item||{}).ImageTags||{};return item&&imageTags.Thumb?ApiClient.getScaledImageUrl(item.Id,{type:"Thumb",width:275,tag:imageTags.Thumb}):item&&item.ParentThumbImageTag?ApiClient.getScaledImageUrl(item.ParentThumbItemId,{type:"Thumb",width:275,tag:item.ParentThumbImageTag}):item&&item.ThumbImageTag?ApiClient.getScaledImageUrl(item.ThumbItemId,{type:"Thumb",width:275,tag:item.ThumbImageTag}):item&&imageTags.Primary?ApiClient.getScaledImageUrl(item.Id,{type:"Primary",width:275,tag:imageTags.Primary}):item&&item.PrimaryImageTag?ApiClient.getScaledImageUrl(item.PrimaryImageItemId,{type:"Primary",width:275,tag:item.PrimaryImageTag}):null},systemUpdateTaskKey:"SystemUpdateTask",renderRunningTasks:function(page,tasks){var html="";tasks=tasks.filter(function(t){return"Idle"!=t.State&&!t.IsHidden}),tasks.length?page.querySelector(".runningTasksContainer").classList.remove("hide"):page.querySelector(".runningTasksContainer").classList.add("hide"),tasks.filter(function(t){return t.Key==DashboardPage.systemUpdateTaskKey}).length?$("#btnUpdateApplication",page).buttonEnabled(!1):$("#btnUpdateApplication",page).buttonEnabled(!0);for(var i=0,length=tasks.length;i<length;i++){var task=tasks[i];if(html+="<p>",html+=task.Name+"<br/>","Running"==task.State){var progress=(task.CurrentProgressPercentage||0).toFixed(1);html+='<progress max="100" value="'+progress+'" title="'+progress+'%">',html+=""+progress+"%",html+="</progress>",html+="<span style='color:#009F00;margin-left:5px;margin-right:5px;'>"+progress+"%</span>",html+='<button type="button" is="paper-icon-button-light" title="'+globalize.translate("ButtonStop")+'" onclick="DashboardPage.stopTask(\''+task.Id+'\');" class="autoSize"><i class="md-icon">cancel</i></button>'}else"Cancelling"==task.State&&(html+='<span style="color:#cc0000;">'+globalize.translate("LabelStopping")+"</span>");html+="</p>"}page.querySelector("#divRunningTasks").innerHTML=html},renderUrls:function(page,systemInfo){var helpButton='<a is="emby-linkbutton" class="raised raised-mini button-submit" href="https://github.com/MediaBrowser/Wiki/wiki/Connectivity" target="_blank" style="margin-left:.7em;font-size:88%;padding:.25em .8em;">'+globalize.translate("ButtonHelp")+"</a>";if(systemInfo.LocalAddress){var localAccessHtml=globalize.translate("LabelLocalAccessUrl",'<a is="emby-linkbutton" class="button-link" href="'+systemInfo.LocalAddress+'" target="_blank">'+systemInfo.LocalAddress+"</a>");$(".localUrl",page).html(localAccessHtml+helpButton).show()}else $(".externalUrl",page).hide();if(systemInfo.WanAddress){var externalUrl=systemInfo.WanAddress,remoteAccessHtml=globalize.translate("LabelRemoteAccessUrl",'<a is="emby-linkbutton" class="button-link" href="'+externalUrl+'" target="_blank">'+externalUrl+"</a>");$(".externalUrl",page).html(remoteAccessHtml+helpButton).show()}else $(".externalUrl",page).hide()},renderSupporterIcon:function(page,pluginSecurityInfo){var imgUrl,text,supporterIconContainer=page.querySelector(".supporterIconContainer");AppInfo.enableSupporterMembership&&pluginSecurityInfo.IsMBSupporter?(supporterIconContainer.classList.remove("hide"),imgUrl="css/images/supporter/supporterbadge.png",text=globalize.translate("MessageThankYouForSupporting"),supporterIconContainer.innerHTML='<a is="emby-linkbutton" class="button-link imageLink supporterIcon" href="http://emby.media/premiere" target="_blank" title="'+text+'"><img src="'+imgUrl+'" style="height:32px;vertical-align: middle; margin-right: .5em;" /></a><span style="text-decoration:none;">'+text+"</span>"):supporterIconContainer.classList.add("hide")},renderHasPendingRestart:function(page,hasPendingRestart){if(hasPendingRestart)page.querySelector("#pUpToDate").classList.add("hide"),$("#pUpdateNow",page).hide();else{if(DashboardPage.lastAppUpdateCheck&&(new Date).getTime()-DashboardPage.lastAppUpdateCheck<18e5)return;DashboardPage.lastAppUpdateCheck=(new Date).getTime(),ApiClient.getAvailableApplicationUpdate().then(function(packageInfo){var version=packageInfo[0];version?(page.querySelector("#pUpToDate").classList.add("hide"),$("#pUpdateNow",page).show(),$("#newVersionNumber",page).html(globalize.translate("VersionXIsAvailableForDownload").replace("{0}",version.versionStr))):(page.querySelector("#pUpToDate").classList.remove("hide"),$("#pUpdateNow",page).hide())})}},renderPendingInstallations:function(page,systemInfo){if(!systemInfo.CompletedInstallations.length)return void page.querySelector("#collapsiblePendingInstallations").classList.add("hide");page.querySelector("#collapsiblePendingInstallations").classList.remove("hide");for(var html="",i=0,length=systemInfo.CompletedInstallations.length;i<length;i++){var update=systemInfo.CompletedInstallations[i];html+="<div><strong>"+update.Name+"</strong> ("+update.Version+")</div>"}$("#pendingInstallations",page).html(html)},renderPluginUpdateInfo:function(page,forceUpdate){!forceUpdate&&DashboardPage.lastPluginUpdateCheck&&(new Date).getTime()-DashboardPage.lastPluginUpdateCheck<18e5||(DashboardPage.lastPluginUpdateCheck=(new Date).getTime(),ApiClient.getAvailablePluginUpdates().then(function(updates){var elem=page.querySelector("#pPluginUpdates");if(!updates.length)return void $(elem).hide();$(elem).show();for(var html="",i=0,length=updates.length;i<length;i++){var update=updates[i];html+="<p><strong>"+globalize.translate("NewVersionOfSomethingAvailable").replace("{0}",update.name)+"</strong></p>",html+='<button type="button" is="emby-button" class="raised block" onclick="DashboardPage.installPluginUpdate(this);" data-name="'+update.name+'" data-guid="'+update.guid+'" data-version="'+update.versionStr+'" data-classification="'+update.classification+'">'+globalize.translate("ButtonUpdateNow")+"</button>"}elem.innerHTML=html}))},installPluginUpdate:function(button){$(button).buttonEnabled(!1);var name=button.getAttribute("data-name"),guid=button.getAttribute("data-guid"),version=button.getAttribute("data-version"),classification=button.getAttribute("data-classification");loading.show(),ApiClient.installPlugin(name,guid,classification,version).then(function(){loading.hide()})},updateApplication:function(){var page=$($.mobile.activePage)[0];$("#btnUpdateApplication",page).buttonEnabled(!1),loading.show(),ApiClient.getScheduledTasks().then(function(tasks){var task=tasks.filter(function(t){return t.Key==DashboardPage.systemUpdateTaskKey})[0];ApiClient.startScheduledTask(task.Id).then(function(){DashboardPage.pollForInfo(page),loading.hide()})})},stopTask:function(id){var page=$($.mobile.activePage)[0];ApiClient.stopScheduledTask(id).then(function(){DashboardPage.pollForInfo(page)})},restart:function(){require(["confirm"],function(confirm){confirm({title:globalize.translate("HeaderRestart"),
text:globalize.translate("MessageConfirmRestart"),confirmText:globalize.translate("ButtonRestart"),primary:"cancel"}).then(function(){$("#btnRestartServer").buttonEnabled(!1),$("#btnShutdown").buttonEnabled(!1),Dashboard.restartServer()})})},shutdown:function(){require(["confirm"],function(confirm){confirm({title:globalize.translate("HeaderShutdown"),text:globalize.translate("MessageConfirmShutdown"),confirmText:globalize.translate("ButtonShutdown"),primary:"cancel"}).then(function(){$("#btnRestartServer").buttonEnabled(!1),$("#btnShutdown").buttonEnabled(!1),ApiClient.shutdownServer()})})}},function($,document,window){function getEntryHtml(entry){var html="";html+='<div class="listItem listItem-noborder">';var color="Error"==entry.Severity||"Fatal"==entry.Severity||"Warn"==entry.Severity?"#cc0000":"#52B54B";if(entry.UserId&&entry.UserPrimaryImageTag){var userImgUrl=ApiClient.getUserImageUrl(entry.UserId,{type:"Primary",tag:entry.UserPrimaryImageTag,height:40});html+='<i class="listItemIcon md-icon" style="width:2em!important;height:2em!important;padding:0;color:transparent;background-color:'+color+";background-image:url('"+userImgUrl+"');background-repeat:no-repeat;background-position:center center;background-size: cover;\">dvr</i>"}else html+='<i class="listItemIcon md-icon" style="background-color:'+color+'">dvr</i>';html+='<div class="listItemBody three-line">',html+='<div class="listItemBodyText">',html+=entry.Name,html+="</div>",html+='<div class="listItemBodyText secondary">';var date=datetime.parseISO8601Date(entry.Date,!0);return html+=datetime.toLocaleString(date).toLowerCase(),html+="</div>",html+='<div class="listItemBodyText secondary listItemBodyText-nowrap">',html+=entry.ShortOverview||"",html+="</div>",html+="</div>",html+="</div>"}function renderList(elem,result,startIndex,limit){var html=result.Items.map(getEntryHtml).join("");if(result.TotalRecordCount>limit){var query={StartIndex:startIndex,Limit:limit};html+=libraryBrowser.getQueryPagingHtml({startIndex:query.StartIndex,limit:query.Limit,totalRecordCount:result.TotalRecordCount,showLimit:!1,updatePageSizeSetting:!1})}elem.innerHTML=html;var btnNextPage=elem.querySelector(".btnNextPage");btnNextPage&&btnNextPage.addEventListener("click",function(){reloadData(elem,startIndex+limit,limit)});var btnPreviousPage=elem.querySelector(".btnPreviousPage");btnPreviousPage&&btnPreviousPage.addEventListener("click",function(){reloadData(elem,startIndex-limit,limit)})}function reloadData(elem,startIndex,limit){null==startIndex&&(startIndex=parseInt(elem.getAttribute("data-activitystartindex")||"0")),limit=limit||parseInt(elem.getAttribute("data-activitylimit")||"7");var minDate=new Date;minDate.setTime(minDate.getTime()-864e5),ApiClient.getJSON(ApiClient.getUrl("System/ActivityLog/Entries",{startIndex:startIndex,limit:limit,minDate:minDate.toISOString()})).then(function(result){elem.setAttribute("data-activitystartindex",startIndex),elem.setAttribute("data-activitylimit",limit),renderList(elem,result,startIndex,limit)})}function createList(elem){elem.each(function(){reloadData(this)}).addClass("activityLogListWidget");var apiClient=ApiClient;apiClient&&(events.on(apiClient,"websocketopen",onSocketOpen),events.on(apiClient,"websocketmessage",onSocketMessage))}function startListening(apiClient){apiClient.isWebSocketOpen()&&apiClient.sendWebSocketMessage("ActivityLogEntryStart","0,1500")}function stopListening(apiClient){apiClient.isWebSocketOpen()&&apiClient.sendWebSocketMessage("ActivityLogEntryStop","0,1500")}function onSocketOpen(){var apiClient=ApiClient;apiClient&&startListening(apiClient)}function onSocketMessage(e,data){var msg=data;"ActivityLogEntry"===msg.MessageType&&$(".activityLogListWidget").each(function(){reloadData(this)})}function destroyList(elem){var apiClient=ApiClient;apiClient&&(events.off(apiClient,"websocketopen",onSocketOpen),events.off(apiClient,"websocketmessage",onSocketMessage),stopListening(apiClient))}$.fn.activityLogList=function(action){"destroy"==action?(this.removeClass("activityLogListWidget"),destroyList(this)):createList(this);var apiClient=ApiClient;return apiClient&&startListening(apiClient),this}}(jQuery,document,window);var welcomeDismissValue="12",welcomeTourKey="welcomeTour";return pageClassOn("pageshow","type-interior",function(){var page=this;Dashboard.getPluginSecurityInfo().then(function(pluginSecurityInfo){if(!page.querySelector(".customSupporterPromotion")&&($(".supporterPromotion",page).remove(),!pluginSecurityInfo.IsMBSupporter&&AppInfo.enableSupporterMembership)){var html='<div class="supporterPromotionContainer"><div class="supporterPromotion"><a class="clearLink" href="http://emby.media/premiere" target="_blank"><button is="emby-button" type="button" class="raised block" style="text-transform:none;background-color:#52B54B;color:#fff;"><div>'+globalize.translate("HeaderSupportTheTeam")+'</div><div style="font-weight:normal;margin-top:5px;">'+globalize.translate("TextEnjoyBonusFeatures")+"</div></button></a></div></div>";page.querySelector(".content-primary").insertAdjacentHTML("afterbegin",html)}})}),function(view,params){view.querySelector(".btnConnectionHelp").addEventListener("click",onConnectionHelpClick),view.querySelector(".btnEditServerName").addEventListener("click",onEditServerNameClick),view.querySelector(".activeDevices").addEventListener("click",onActiveDevicesClick),$(".btnTakeTour",view).on("click",function(){takeTour(view,Dashboard.getCurrentUserId())}),view.addEventListener("viewshow",function(){var page=this,apiClient=ApiClient;apiClient&&(DashboardPage.newsStartIndex=0,loading.show(),DashboardPage.pollForInfo(page),DashboardPage.startInterval(apiClient),events.on(apiClient,"websocketmessage",DashboardPage.onWebSocketMessage),events.on(apiClient,"websocketopen",DashboardPage.onWebSocketOpen),DashboardPage.lastAppUpdateCheck=null,DashboardPage.lastPluginUpdateCheck=null,Dashboard.getPluginSecurityInfo().then(function(pluginSecurityInfo){DashboardPage.renderSupporterIcon(page,pluginSecurityInfo)}),DashboardPage.reloadSystemInfo(page),DashboardPage.reloadNews(page),DashboardPage.sessionUpdateTimer=setInterval(DashboardPage.refreshSessionsLocally,6e4),$(".activityItems",page).activityLogList(),$(".swaggerLink",page).attr("href",apiClient.getUrl("swagger-ui/index.html",{api_key:ApiClient.accessToken()})),apiClient&&!AppInfo.isNativeApp&&showWelcomeIfNeeded(page,apiClient),refreshActiveRecordings(view,apiClient))}),view.addEventListener("viewbeforehide",function(){var page=this;$(".activityItems",page).activityLogList("destroy");var apiClient=ApiClient;apiClient&&(events.off(apiClient,"websocketmessage",DashboardPage.onWebSocketMessage),events.off(apiClient,"websocketopen",DashboardPage.onWebSocketOpen),DashboardPage.stopInterval(apiClient)),DashboardPage.sessionUpdateTimer&&clearInterval(DashboardPage.sessionUpdateTimer)})}});