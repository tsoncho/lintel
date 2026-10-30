mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::read_project_file,
            commands::write_project_file,
            commands::pick_open_path,
            commands::pick_save_path,
            commands::read_settings,
            commands::write_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lintel");
}
