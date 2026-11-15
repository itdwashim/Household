package com.householdhelp.register;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import java.io.OutputStream;

/**
 * Lets the web app save a file (backup, CSV, attached document) into the phone's
 * Downloads folder, inside a "Help Register" sub-folder. Needs no storage permission
 * (Android 10 and newer, which this app already requires).
 * Called from the page as AndroidFiles.save(fileName, mimeType, base64Data).
 */
public class FileBridge {
    private final Context ctx;

    public FileBridge(Context c) {
        ctx = c;
    }

    @JavascriptInterface
    public boolean save(String name, String mime, String base64) {
        try {
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            String safe = (name == null || name.trim().isEmpty()) ? "file" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
            ContentResolver cr = ctx.getContentResolver();
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, safe);
            v.put(MediaStore.Downloads.MIME_TYPE, (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime);
            v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Help Register");
            v.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) return false;
            OutputStream out = cr.openOutputStream(uri);
            if (out == null) {
                cr.delete(uri, null, null);
                return false;
            }
            try {
                out.write(data);
            } finally {
                out.close();
            }
            ContentValues done = new ContentValues();
            done.put(MediaStore.Downloads.IS_PENDING, 0);
            cr.update(uri, done, null, null);
            final String shown = safe;
            new Handler(Looper.getMainLooper()).post(new Runnable() {
                @Override public void run() {
                    Toast.makeText(ctx, "Saved in Downloads/Help Register: " + shown, Toast.LENGTH_LONG).show();
                }
            });
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
