import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Lấy danh sách ổ đĩa trên Windows
 */
export const getDrives = async (req, res) => {
    try {
        // Sử dụng PowerShell để lấy thông tin ổ đĩa (JSON format)
        const psCommand = 'Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, FreeSpace, Size | ConvertTo-Json';
        const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCommand}"`);
        
        if (!stdout.trim()) {
            return res.json({ success: true, drives: [] });
        }

        let drivesData = JSON.parse(stdout);
        // Nếu chỉ có 1 ổ đĩa, PowerShell trả về object thay vì array, nên cần bọc lại
        if (!Array.isArray(drivesData)) {
            drivesData = [drivesData];
        }

        const drives = drivesData.map(d => ({
            caption: d.DeviceID + '\\',
            freeSpace: parseInt(d.FreeSpace) || 0,
            size: parseInt(d.Size) || 0
        }));
        
        return res.json({ success: true, drives });
    } catch (error) {
        console.error('[SystemController] getDrives error:', error);
        return res.status(500).json({ error: 'Không thể lấy danh sách ổ đĩa' });
    }
};

/**
 * Liệt kê thư mục con của một đường dẫn
 */
export const listDirectory = async (req, res) => {
    const { dirPath } = req.query;
    
    if (!dirPath) {
        return res.status(400).json({ error: 'Thiếu tham số dirPath' });
    }

    try {
        const absolutePath = path.resolve(dirPath);
        const entries = await fs.readdir(absolutePath, { withFileTypes: true });
        
        const directories = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
            .sort((a, b) => a.localeCompare(b));

        return res.json({ 
            success: true, 
            currentPath: absolutePath,
            parentPath: path.dirname(absolutePath),
            directories 
        });
    } catch (error) {
        console.error('[SystemController] listDirectory error:', error);
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            return res.status(403).json({ error: 'Không có quyền truy cập thư mục này' });
        }
        return res.status(500).json({ error: 'Không thể đọc thư mục' });
    }
};

/**
 * Controller cũ (Native Dialog) - Giữ lại nếu cần
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
