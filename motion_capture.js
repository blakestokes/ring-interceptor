import 'dotenv/config';
import { RingApi } from 'ring-client-api';
import * as fs from 'fs';
import { promisify } from 'util';

const ringApi = new RingApi({
	refreshToken: process.env.RING_REFRESH_TOKEN,
	// The following are all optional
	cameraStatusPollingSeconds: 20,
	cameraDingsPollingSeconds: 2
});

const camera = await ringApi.getCameras()[0];

ringApi.onRefreshTokenUpdated.subscribe(
	async ({ newRefreshToken, oldRefreshToken }) => {
		if (!oldRefreshToken) {
			return
		}

		const currentConfig = await promisify(fs.readFile)('.env'),
		updatedConfig = currentConfig
			.toString()
			.replace(oldRefreshToken, newRefreshToken)

		await promisify(fs.writeFile)('.env', updatedConfig)
	}
)

camera.onNewDing.subscribe(async (ding) => {
  	if (ding) {
		// Only wanted motion detection, not when the doorbell is rang
    	if (ding.kind === 'motion') {
      		const dir = `/media/footage/`;
      		const files = fs.readdirSync(dir, 'utf8');

			// Delete Files Older than a Week Ago
			var weekAgoDate = new Date();
			weekAgoDate.setDate(weekAgoDate.getDate() - 7);
			var weekAgoMs = weekAgoDate.getTime();

			var folderSizeInBytes = 0;
			for (let file of files) {
				var filePath = dir + file;
				var createdDateMs = fs.statSync(filePath).birthtimeMs;
				if (createdDateMs <= weekAgoMs) {
					// Delete File
					fs.unlinkSync(filePath);
				}
				folderSizeInBytes += fs.statSync(filePath).size;
			}

			// 500 GB set limit
			var allotedSizeBytes = 500000000000;

			while (folderSizeInBytes >= allotedSizeBytes) {
				// Sort by oldest to newest
				files.sort(function (a, b) {
					return fs.statSync(dir + a).birthtimeMs - fs.statSync(dir + b).birthtimeMs;
				});
				var file = files[0];
				var filePath = dir + file;
				folderSizeInBytes -= fs.statSync(filePath).size;
				fs.unlinkSync(filePath);
				files.shift();
			}

			console.log("Motion Detected! " + camera.name);
			console.log("Recording 30 Second Video...");

			let date_ob = new Date();
			date_ob = new Date(date_ob.toLocaleString('en-US', { timeZone: 'America/Denver' }));
			let date = ("0" + date_ob.getDate()).slice(-2);
			const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			let month = months[date_ob.getMonth()];
			let year = date_ob.getFullYear();
			let hours = date_ob.getHours();
			let ampm = hours >= 12 ? 'PM' : 'AM';
			hours = hours % 12;
			hours = hours ? hours : 12;
			let minutes = date_ob.getMinutes().toString().padStart(2, '0');
			let seconds = date_ob.getSeconds().toString().padStart(2, '0');
			let date_str = `${date}-${month}-${year} ${hours}-${minutes}-${seconds} ${ampm}`;

			// Windows Path
			let path = `/media/footage/Motion - ${date_str}.mp4`;

			await camera.recordToFile(path, 30);
			console.log("Finished Recording Video");
			console.log("Video Path: " + path + '\n');
		}
	}
})