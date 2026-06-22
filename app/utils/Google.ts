import { MultipartFile } from "@adonisjs/core/types/bodyparser";
import drive from "@adonisjs/drive/services/main";
import fs from "fs";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";


export const generateThumbnail = async (input: Buffer): Promise<Buffer> => {
  return await sharp(input)
    .resize(50, 50, { fit: 'inside' }) // match image-thumbnail behavior
    .toFormat('jpeg', { quality: 80 })
    .toBuffer()
}


export class Google {
  static async uploadFile(file: MultipartFile, folder: string, type = "image") {
    // let result = 0;
    // let resultThumb = 0;
    let url = "";
    let url_short = "";
    let url_thumb_short = "";
    let url_thumb = "";
    let extension = file.extname;

    if (file) {
      const gcsDrive = drive.use('gcs')
      let fileName = uuidv4();

      var buffer = fs.readFileSync(file.tmpPath!);
      let thumbnail = null;

      if (type === "image") {
        thumbnail = await generateThumbnail(buffer);
      }

      await gcsDrive
        .put(`${folder}/${fileName}.${extension}`, buffer, { visibility: 'public' })



      let raw_url = await drive.use('gcs').getSignedUrl(`${folder}/${fileName}.${extension}`);
      url = Google.fixUrlSignature(raw_url);
      url_short = `${folder}/${fileName}.${extension}`;

      if (thumbnail) {
        await gcsDrive
          .put(`${folder}/thumb_${fileName}.${extension}`, thumbnail, { visibility: 'public' })
        let raw_url_thumb = await gcsDrive
          .getSignedUrl(`${folder}/thumb_${fileName}.${extension}`);
        url_thumb = Google.fixUrlSignature(raw_url_thumb);
        url_thumb_short = `${folder}/thumb_${fileName}.${extension}`;
      }
    }


    return {
      url: url,
      url_short: url_short,
      url_thumb: url_thumb,
      url_thumb_short: url_thumb_short,
    }
  }

  private static fixUrlSignature(url: string): string {
    return url.replace(/Signature=([^&]+)/, (_match, p1) => 'Signature=' + p1.replace(/\+/g, '%2B'));
  }

  public static async getSignedUrl(filePath: string) {
    const gcsDrive = drive.use('gcs')
    const url = await gcsDrive.getSignedUrl(filePath)
    return Google.fixUrlSignature(url);
  }

  public static async deleteFile(filePath: string) {
    try {
      const gcsDrive = drive.use('gcs')
      await gcsDrive.delete(filePath);
    } catch (error) {
      console.error(`Failed to delete file from GCS at ${filePath}:`, error.message || error);
    }
    return;
  }
}
