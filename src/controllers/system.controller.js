
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Controller xử lý các tác vụ hệ thống
 */
export const selectDirectory = async (req, res) => {
    try {
        // Lệnh PowerShell để mở Folder Browser Dialog
        // Note: Cần set-executionpolicy nếu bị chặn, nhưng lệnh inline này thường chạy được.
        // Dùng Add-Type để gọi FolderBrowserDialog của Windows Forms.
        const psCommand = `
            Add-Type -AssemblyName System.Windows.Forms;
            $f = New-Object System.Windows.Forms.FolderBrowserDialog;
            $f.Description = 'Chọn thư mục lưu trữ dữ liệu TikTok Live';
            $f.ShowNewFolderButton = $true;
            $t = New-Object System.Windows.Forms.Form;
            $t.TopMost = $true;
            if($f.ShowDialog($t) -eq 'OK'){
                $f.SelectedPath
            }
            $t.Dispose();
        `.replace(/\n/g, ' ').trim();

        console.log('[SystemController] Executing PS (STA):', psCommand);
        
        // Dùng -STA để đảm bảo GUI không bị treo và thêm timeout 30s
        const { stdout, stderr } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -STA -Command "${psCommand}"`, { timeout: 30000 });

        if (stderr) {
            console.error('[SystemController] PS Error:', stderr);
            return res.status(500).json({ error: 'Lỗi khi mở hộp chọn thư mục' });
        }

        const path = stdout.trim();
        if (!path) {
            return res.json({ success: false, message: 'Đã hủy chọn' });
        }

        return res.json({ success: true, path });
    } catch (error) {
        console.error('[SystemController] Error:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ khi chọn thư mục' });
    }
};
