(function initAmplitude() {
    if (window.engagement && window.engagement.plugin) {
        window.amplitude.add(window.engagement.plugin());
    }
    if (window.sessionReplay && window.sessionReplay.plugin) {
        window.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
    }
    window.amplitude.init('f0db16a2ac68ab1c81271aeabdb148de', {
        fetchRemoteConfig: true,
        autocapture: true,
    });
})();
