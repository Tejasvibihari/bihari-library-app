// AutoUpdateService.js
import { Alert, Linking, BackHandler } from 'react-native';
import RNFS from 'react-native-fs';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import DeviceInfo from 'react-native-device-info';

class AutoUpdateService {
    constructor(config) {
        this.serverUrl = config.serverUrl;
        this.currentVersion = config.currentVersion || DeviceInfo.getVersion();
        // this.checkInterval = config.checkInterval || 24 * 60 * 60 * 1000; // 24 hours
        this.checkInterval = config.checkInterval || 0; // 24 hours
        this.forceUpdate = config.forceUpdate || false;
    }

    // Check for updates from your server
    async checkForUpdates() {
        try {
            const response = await fetch(`${this.serverUrl}/api/version-check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentVersion: this.currentVersion,
                    platform: Platform.OS,
                }),
            });

            const data = await response.json();

            if (data.updateAvailable) {
                this.showUpdateDialog(data);
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }

    // Show update dialog to user
    showUpdateDialog(updateInfo) {
        const { version, downloadUrl, releaseNotes, forceUpdate } = updateInfo;

        Alert.alert(
            'Update Available',
            `A new version (${version}) is available.\n\n${releaseNotes || 'Bug fixes and improvements.'}`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                        if (forceUpdate) {
                            this.forceCloseApp();
                        }
                    },
                },
                {
                    text: 'Update',
                    onPress: () => this.downloadAndInstallUpdate(downloadUrl),
                },
            ],
            { cancelable: !forceUpdate }
        );
    }

    // Force close the app if update is mandatory and user cancels
    forceCloseApp() {
        Alert.alert(
            'Update Required',
            'This update is mandatory. The app will now close.',
            [
                {
                    text: 'OK',
                    onPress: () => BackHandler.exitApp(),
                },
            ],
            { cancelable: false }
        );
    }

    // Download and install the update
    async downloadAndInstallUpdate(downloadUrl) {
        try {
            // Request storage permission
            await this.requestStoragePermission();

            // Show download progress
            Alert.alert('Downloading...', 'Please wait while the update is being downloaded.');

            const downloadDest = `${RNFS.ExternalDirectoryPath}/app-update.apk`;

            const downloadOptions = {
                fromUrl: downloadUrl,
                toFile: downloadDest,
                progress: (res) => {
                    const progress = (res.bytesWritten / res.contentLength) * 100;
                    console.log(`Download progress: ${progress.toFixed(2)}%`);
                },
            };

            const download = RNFS.downloadFile(downloadOptions);
            const result = await download.promise;

            if (result.statusCode === 200) {
                this.installApk(downloadDest);
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Error downloading update:', error);
            Alert.alert('Download Failed', 'Failed to download the update. Please try again.');
        }
    }

    // Install the downloaded APK
    installApk(filePath) {
        Alert.alert(
            'Download Complete',
            'The update has been downloaded. Do you want to install it now?',
            [
                {
                    text: 'Later',
                    style: 'cancel',
                },
                {
                    text: 'Install',
                    onPress: () => {
                        // Open the APK file for installation
                        Linking.openURL(`file://${filePath}`)
                            .catch(err => {
                                console.error('Error opening APK:', err);
                                Alert.alert('Installation Error', 'Could not open the installer.');
                            });
                    },
                },
            ]
        );
    }

    // Request storage permission for Android
    async requestStoragePermission() {
        if (Platform.OS === 'android') {
            const permission = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
            const result = await check(permission);

            if (result !== RESULTS.GRANTED) {
                const requestResult = await request(permission);
                if (requestResult !== RESULTS.GRANTED) {
                    throw new Error('Storage permission not granted');
                }
            }
        }
    }

    // Start periodic update checks
    startPeriodicChecks() {
        // Check immediately on app start
        this.checkForUpdates();

        // Set up periodic checks
        this.updateInterval = setInterval(() => {
            this.checkForUpdates();
        }, this.checkInterval);
    }

    // Stop periodic checks
    stopPeriodicChecks() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

export default AutoUpdateService;