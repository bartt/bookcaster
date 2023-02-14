const userAgent = window.navigator.userAgent;
const IOS_VERSION_RE = /OS\s+(\d)_/;
const SECOND = 1000;

class Launcher {
    timers = [];
    events = ["pagehide", "blur"];

    static #isAndroid() {
        return /Android/.test(userAgent);
    };

    static #isIOS() {
        return /(?:i(?:Phone|P(?:o|a)d))/.test(userAgent);
    };

    static #iOSVersion() {
        return Launcher.#isIOS() ? parseInt(userAgent.match(IOS_VERSION_RE)[1], 10) : 0;
    };

    static #isChrome() {
        // Opera (OPR) also identifies itself as Chrome and has to be corrected for.
        // OPR is used on Android but on iOS it is OPiOS where Opera does NOT identify as Chrome. Go figure!
        // Probably because on iOS it is Opera Mini and as all browsers has to be based on Safari/WebKit.
        return /Chrome/.test(userAgent) && !/OPR/.test(userAgent);
    };

    static #isFirefox() {
        return /Firefox/.test(userAgent);
    };

    constructor() {
        if (Launcher.#isIOS() || (Launcher.#isAndroid() && !Launcher.#isChrome())) {
            this.events.push("beforeunload");
        }
        for (let event of this.events) {
            window.addEventListener(event, (e) => {
                this.clearTimers();
            })
        }
    }

    // Stop any running timers.
    clearTimers() {
        console.log("Clearing timers: [" + this.timers.join(', ') + ']');
        this.timers.map(clearTimeout);
        this.timers = [];
    }

    handleEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        var downcastURL = e.target.closest('a').getAttribute('href');
        var podcastURL = downcastURL.replace(/^itpc/, 'feed');
        this.openApp(downcastURL, podcastURL)
    }

    // If this handler is part of the UI thread, i.e. the `direct` result of a user action then
    // redirecting to the App Store will happen immediately. When not part of the UI thread however,
    // the redirect will bring up an Open in App dialog. Unless there is already a dialog showing,
    // in which case the redirect dialog will wait for the currently shown dialog to be dismissed.
    openApp(deeplink, fallback) {
        setTimeout(() => {
            let fallbackLaunched = false;
            let gotFallback = "string" == typeof fallback;
            gotFallback && this.timers.push(setTimeout(() => {
                fallbackLaunched = true;
                window.top.location = fallback;
            }, 1 * SECOND));
            Launcher.#isIOS() && this.timers.push(window.setTimeout(() => {
                fallbackLaunched && window.location.reload()
            }, 2 * SECOND));
            window.location = deeplink;
        }, 0 * SECOND)
    }
}

const launcher = new Launcher();
document.querySelectorAll('.feed').forEach((feed) => feed.addEventListener('click', launcher))