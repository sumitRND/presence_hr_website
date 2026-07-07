module.exports = {
    apps: [
        {
            name: "presence-hr-website",
            script: "npm",
            args: "run start",
            cwd: "/opt/presence_hr_website",
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            env: {
                NODE_ENV: "production",
                PORT: 3002,
            },
            error_file: "./logs/error.log",
            out_file: "./logs/out.log",
            log_file: "./logs/combined.log",
            time: true,
        },
    ],
};
