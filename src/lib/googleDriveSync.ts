// Google Identity Services (GSI) and Google Drive API purely client-side sync helper.
// This handles OAuth2 authentication and REST file storage inside the user's private Google Drive (drive.file scope).

declare global {
  interface Window {
    google: any;
  }
}

// 1. Dynamically load the Google Identity Services Client Script
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error("Google Identity Services script loaded but oauth2 namespace was not found."));
      }
    };

    script.onerror = () => {
      reject(new Error("Failed to load Google Identity Services script from accounts.google.com."));
    };

    document.head.appendChild(script);
  });
}

// 2. Trigger standard OAuth2 Authorization flow to obtain access token
export function authorizeGoogleDrive(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error("Google OAuth2 library is not loaded. Please make sure script is loaded."));
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(`授權失敗：${response.error_description || response.error}`));
            return;
          }
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error("授權失敗：未獲得 access_token。"));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(`OAuth2 連線出錯：${err.message || err}`));
        },
      });

      client.requestAccessToken({ prompt: "consent" });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// 3. Search for the etf_lookthrough_backup.json file inside the user's Google Drive
export async function findBackupFile(token: string): Promise<{ id: string; modifiedTime: string } | null> {
  const q = encodeURIComponent("name = 'etf_lookthrough_backup.json' and trashed = false");
  const fields = encodeURIComponent("files(id, name, modifiedTime)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&spaces=drive`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`尋找雲端檔案失敗 (HTTP ${response.status}): ${errorText.slice(0, 150)}`);
  }

  const data = (await response.json()) as {
    files?: Array<{ id: string; modifiedTime: string }>;
  };

  if (data.files && data.files.length > 0) {
    return {
      id: data.files[0].id,
      modifiedTime: data.files[0].modifiedTime,
    };
  }

  return null;
}

// 4. Download backup file content by its file ID
export async function downloadBackupFile(token: string, fileId: string): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`下載雲端備份失敗 (HTTP ${response.status}): ${errorText.slice(0, 150)}`);
  }

  return response.json();
}

// 5. Upload backup content to Google Drive (POST if new, PATCH if update)
export async function uploadBackupFile(
  token: string,
  backupData: any,
  existingFileId?: string,
): Promise<string> {
  const boundary = "314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: "etf_lookthrough_backup.json",
    mimeType: "application/json",
  };

  const content = JSON.stringify(backupData, null, 2);

  if (existingFileId) {
    // 5a. PATCH (update) existing file
    const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: content,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`更新雲端備份失敗 (HTTP ${response.status}): ${errorText.slice(0, 150)}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  } else {
    // 5b. POST (create) new file
    const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const multipartBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      content +
      closeDelimiter;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`建立雲端備份失敗 (HTTP ${response.status}): ${errorText.slice(0, 150)}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }
}
