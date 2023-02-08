var launcher = (function () {
    var events = ["pagehide", "blur"];
    var IOS_VERSION_RE = /OS\s+(\d)_/;
    var SECOND = 1000;
    var timers = [];
    var userAgent = window.navigator.userAgent;
    var isAndroid = function () {
        return /Android/.test(userAgent);
    };
    var isIOS = function () {
        return /(?:i(?:Phone|P(?:o|a)d))/.test(userAgent);
    };
    var iOSVersion = function () {
        return isIOS() ? parseInt(userAgent.match(IOS_VERSION_RE)[1], 10) : 0;
    };
    var isChrome = function () {
        // Opera (OPR) also identifies itself as Chrome and has to be corrected for.
        // OPR is used on Android but on iOS it is OPiOS where Opera does NOT identify as Chrome. Go figure!
        // Probably because on iOS it is Opera Mini and as all browsers has to be based on Safari/WebKit.
        return /Chrome/.test(userAgent) && !/OPR/.test(userAgent);
    };
    var isFirefox = function () {
        return /Firefox/.test(userAgent);
    };

    if (isIOS() || (isAndroid() && !isChrome())) {
        events.push("beforeunload");
    }

    return {
        // Stop any running timers.
        clearTimers: function () {
            console.log("Clearing timers: [" + timers.join(', ') + ']');
            timers.map(clearTimeout);
            timers = [];
        },
        // If this handler is part of the UI thread, i.e. the `direct` result of a user action then
        // redirecting to the App Store will happen immediately. When not part of the UI thread however,
        // the redirect will bring up an Open in App dialog. Unless there is already a dialog showing,
        // in which case the redirect dialog will wait for the currently shown dialog to be dismissed.
        openApp: function (deeplink, fallback) {
            setTimeout(function () {
                var fallbackLaunched = false;
                var gotFallback = "string" == typeof fallback;
                gotFallback && timers.push(setTimeout(function () {
                    fallbackLaunched = true;
                    window.top.location = fallback;
                }, 1 * SECOND));
                isIOS() && timers.push(window.setTimeout(function () {
                    fallbackLaunched && window.location.reload()
                }, 2 * SECOND));
                window.location = deeplink;
            }, 0 * SECOND)
        },
        init: function () {
            var launcher = this;
            $(window).on(events.join(" "), function (e) {
                launcher.clearTimers();
            })
        }
    }
})();
launcher.init();

$('.feed').click(function (e) {
    e.preventDefault();
    e.stopPropagation();
    var downcastURL = $(e.target).closest('a').attr('href');
    var podcastURL = downcastURL.replace(/^itpc/, 'feed');
    launcher.openApp(downcastURL, podcastURL)
})