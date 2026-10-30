use std::io::ErrorKind;
use std::path::PathBuf;
use tauri::Manager;

const MAX_PROJECT_BYTES: u64 = 20 * 1024 * 1024;
const MAX_SETTINGS_BYTES: usize = 64 * 1024;

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
pub fn read_project_file(path: String) -> Result<String, String> {
    let file = PathBuf::from(&path);
    let metadata = std::fs::metadata(&file).map_err(|error| error.to_string())?;
    if !metadata.is_file() {
        return Err("Choose a project file, not a folder.".into());
    }
    if metadata.len() > MAX_PROJECT_BYTES {
        return Err("This file is larger than 20 MB.".into());
    }
    std::fs::read_to_string(file).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn write_project_file(path: String, contents: String) -> Result<(), String> {
    if contents.len() > MAX_PROJECT_BYTES as usize {
        return Err("The project is larger than 20 MB.".into());
    }
    let file = PathBuf::from(&path);
    let parent = file.parent().ok_or("The save location has no folder.")?;
    if !parent.exists() {
        return Err("The save folder does not exist.".into());
    }
    let temporary = file.with_extension("lintel.tmp");
    std::fs::write(&temporary, contents).map_err(|error| error.to_string())?;
    std::fs::rename(&temporary, &file).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn pick_open_path() -> Result<Option<String>, String> {
    let picked = tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Open Lintel project")
            .add_filter("Lintel project", &["lintel"])
            .pick_file()
    })
    .await
    .map_err(|error| error.to_string())?;
    Ok(picked.map(|path| path.display().to_string()))
}

#[tauri::command]
pub async fn pick_save_path(suggested: String) -> Result<Option<String>, String> {
    let picked = tauri::async_runtime::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_title("Save Lintel project")
            .add_filter("Lintel project", &["lintel"])
            .set_file_name(suggested)
            .save_file()
    })
    .await
    .map_err(|error| error.to_string())?;
    Ok(picked.map(|path| path.display().to_string()))
}

#[tauri::command]
pub fn read_settings(app: tauri::AppHandle) -> Result<String, String> {
    let path = settings_path(&app)?;
    match std::fs::read_to_string(path) {
        Ok(text) => Ok(text),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok("{}".into()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub fn write_settings(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    if contents.len() > MAX_SETTINGS_BYTES {
        return Err("Settings are too large.".into());
    }
    let path = settings_path(&app)?;
    std::fs::write(path, contents).map_err(|error| error.to_string())
}
