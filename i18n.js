// ========== i18n - Bilingual VI / EN ==========
const translations = {
    vi: {
        // Nav
        'nav.home': 'Trang Chủ', 'nav.about': 'Về Tôi', 'nav.projects': 'Dự Án',
        'nav.certificates': 'Chứng Chỉ', 'nav.skills': 'Kỹ Năng', 'nav.map': 'Vị Trí', 'nav.contact': 'Liên Hệ',
        // Hero
        'hero.title': 'Xin Chào! 👋',
        'hero.desc': 'Chào mừng bạn đến với trang cá nhân của tôi. Tôi là một lập trình viên chuyên về phát triển ứng dụng web và hệ thống. Tôi tập trung vào việc xây dựng các giải pháp công nghệ ổn định, hiệu quả và có khả năng mở rộng, đáp ứng nhu cầu thực tế của doanh nghiệp và người dùng.',
        'hero.btn1': 'Tìm Hiểu Thêm', 'hero.btn2': 'Liên Hệ Với Tôi', 'hero.btn3': 'Tải CV',
        // About
        'about.title': 'Về Tôi',
        'about.desc': 'Với nền tảng vững chắc trong phát triển phần mềm, tôi đã tham gia và triển khai nhiều dự án trong các lĩnh vực khác nhau. Tôi đề cao tính kỷ luật trong công việc, tư duy hệ thống và khả năng giải quyết vấn đề.',
        'about.connect': 'Kết Nối Với Tôi',
        'about.exp.title': '💼 Kinh Nghiệm', 'about.exp.desc': 'Với hơn một thập kỷ kinh nghiệm, tôi đã giúp nhiều công ty phát triển và đạt được mục tiêu của họ.',
        'about.goal.title': '🎯 Mục Tiêu', 'about.goal.desc': 'Mục tiêu của tôi là tạo ra tác động tích cực thông qua công nghệ và giáo dục.',
        'about.passion.title': '� Đam Mê', 'about.passion.desc': 'Tôi đam mê học hỏi những công nghệ mới và chia sẻ kiến thức với cộng đồng.',
        // Projects
        'projects.title': 'Dự Án Nổi Bật',
        'projects.filter.all': 'Tất Cả',
        'projects.p1.title': 'Website Thương Mại Điện Tử', 'projects.p1.desc': 'Nền tảng mua sắm trực tuyến hiện đại với thanh toán an toàn và giao diện thân thiện.',
        'projects.p2.title': 'Quản Lý Dự Án', 'projects.p2.desc': 'Công cụ quản lý dự án toàn diện giúp tổ chức công việc và cộng tác nhóm hiệu quả.',
        'projects.p3.title': 'Dashboard Phân Tích Dữ Liệu', 'projects.p3.desc': 'Hệ thống visualize dữ liệu real-time với biểu đồ tương tác và báo cáo chi tiết.',
        // Skills
        'skills.title': 'Kỹ Năng Kỹ Thuật',
        // Testimonials
        'testimonials.title': '💬 Đánh Giá Của Khách Hàng',
        'testimonials.subtitle': 'Những lời nhận xét từ các công ty và dự án tôi đã hợp tác',
        // Certificates
        'certs.title': '🏆 Chứng Chỉ & Giải Thưởng',
        // Map
        'map.title': '📍 Vị Trí Của Tôi',
        // Contact
        'contact.title': '📧 Liên Hệ Với Tôi',
        'contact.subtitle': 'Hãy để lại tin nhắn của bạn. Tôi sẽ phản hồi sớm nhất có thể!',
        'contact.name': 'Họ & Tên *', 'contact.email': 'Email *', 'contact.subject': 'Chủ Đề', 'contact.message': 'Tin Nhắn *',
        'contact.name.ph': 'Nhập tên của bạn', 'contact.subject.ph': 'Chủ đề tin nhắn', 'contact.message.ph': 'Viết tin nhắn của bạn ở đây...',
        'contact.send': '📤 Gửi Tin Nhắn',
        'contact.phone.label': '📞 Điện Thoại', 'contact.email.label': '📧 Email', 'contact.addr.label': '📍 Địa Chỉ',
        'contact.addr.val': 'Hồ Chí Minh, Việt Nam',
        // Feedback
        'feedback.title': '💬 Phản Hồi & Bình Luận',
        'feedback.subtitle': 'Chia sẻ ý kiến của bạn về portfolio và dự án của tôi',
        'feedback.form.title': 'Để Lại Bình Luận',
        'feedback.name': 'Tên của bạn *', 'feedback.name.ph': 'Nhập tên của bạn',
        'feedback.email': 'Email (Không bắt buộc)',
        'feedback.rating': 'Đánh Giá *', 'feedback.text': 'Bình Luận *',
        'feedback.text.ph': 'Chia sẻ ý kiến hoặc nhận xét của bạn...',
        'feedback.send': 'Gửi Bình Luận',
        'feedback.list.title': 'Bình Luận',
        'feedback.sort.newest': 'Mới nhất', 'feedback.sort.oldest': 'Cũ nhất', 'feedback.sort.rating': 'Đánh giá cao',
        'feedback.reply': 'Trả lời',
        // Stats
        'stats.views': 'Lượt Xem', 'stats.likes': 'Lượt Thích', 'stats.comments': 'Bình Luận', 'stats.rating': 'Đánh Giá TB',
        // Footer
        'footer.follow': 'Theo Dõi Tôi',
        'footer.copy': '© 2026 Trang Cá Nhân của Tôi. Bản quyền được bảo vệ.',
        // Chat
        'chat.placeholder': 'Nhập tin nhắn...', 'chat.send': 'Gửi',
        // Toast
        'toast.welcome': '👋 Chào mừng bạn đến với trang cá nhân của tôi!',
    },
    en: {
        // Nav
        'nav.home': 'Home', 'nav.about': 'About', 'nav.projects': 'Projects',
        'nav.certificates': 'Certificates', 'nav.skills': 'Skills', 'nav.map': 'Location', 'nav.contact': 'Contact',
        // Hero
        'hero.title': 'Hello! 👋',
        'hero.desc': 'Welcome to my personal portfolio. I am a developer specializing in web application and system development, focused on building stable, efficient, and scalable technology solutions that meet real business and user needs.',
        'hero.btn1': 'Learn More', 'hero.btn2': 'Contact Me', 'hero.btn3': 'Download CV',
        // About
        'about.title': 'About Me',
        'about.desc': 'With a solid foundation in software development, I have participated in and deployed many projects across various fields. I value discipline, systematic thinking, and problem-solving ability.',
        'about.connect': 'Connect With Me',
        'about.exp.title': '💼 Experience', 'about.exp.desc': 'With over a decade of experience, I have helped many companies grow and achieve their goals.',
        'about.goal.title': '🎯 Goals', 'about.goal.desc': 'My goal is to create a positive impact through technology and education.',
        'about.passion.title': '🚀 Passion', 'about.passion.desc': 'I am passionate about learning new technologies and sharing knowledge with the community.',
        // Projects
        'projects.title': 'Featured Projects',
        'projects.filter.all': 'All',
        'projects.p1.title': 'E-Commerce Website', 'projects.p1.desc': 'A modern online shopping platform with secure payments and a user-friendly interface.',
        'projects.p2.title': 'Project Management', 'projects.p2.desc': 'A comprehensive project management tool to organize work and collaborate effectively.',
        'projects.p3.title': 'Data Analytics Dashboard', 'projects.p3.desc': 'A real-time data visualization system with interactive charts and detailed reports.',
        // Skills
        'skills.title': 'Technical Skills',
        // Testimonials
        'testimonials.title': '💬 Client Reviews',
        'testimonials.subtitle': 'Feedback from companies and projects I have collaborated with',
        // Certificates
        'certs.title': '🏆 Certificates & Awards',
        // Map
        'map.title': '📍 My Location',
        // Contact
        'contact.title': '📧 Contact Me',
        'contact.subtitle': 'Leave your message. I will respond as soon as possible!',
        'contact.name': 'Full Name *', 'contact.email': 'Email *', 'contact.subject': 'Subject', 'contact.message': 'Message *',
        'contact.name.ph': 'Enter your name', 'contact.subject.ph': 'Message subject', 'contact.message.ph': 'Write your message here...',
        'contact.send': '📤 Send Message',
        'contact.phone.label': '📞 Phone', 'contact.email.label': '📧 Email', 'contact.addr.label': '📍 Address',
        'contact.addr.val': 'Ho Chi Minh City, Vietnam',
        // Feedback
        'feedback.title': '💬 Feedback & Comments',
        'feedback.subtitle': 'Share your thoughts about my portfolio and projects',
        'feedback.form.title': 'Leave a Comment',
        'feedback.name': 'Your Name *', 'feedback.name.ph': 'Enter your name',
        'feedback.email': 'Email (Optional)',
        'feedback.rating': 'Rating *', 'feedback.text': 'Comment *',
        'feedback.text.ph': 'Share your opinion or feedback...',
        'feedback.send': 'Post Comment',
        'feedback.list.title': 'Comments',
        'feedback.sort.newest': 'Newest', 'feedback.sort.oldest': 'Oldest', 'feedback.sort.rating': 'Top Rated',
        'feedback.reply': 'Reply',
        // Stats
        'stats.views': 'Views', 'stats.likes': 'Likes', 'stats.comments': 'Comments', 'stats.rating': 'Avg Rating',
        // Footer
        'footer.follow': 'Follow Me',
        'footer.copy': '© 2026 My Personal Portfolio. All rights reserved.',
        // Chat
        'chat.placeholder': 'Type a message...', 'chat.send': 'Send',
        // Toast
        'toast.welcome': '👋 Welcome to my personal portfolio!',
    }
};

let currentLang = localStorage.getItem('lang') || 'vi';

function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const val = t(el.getAttribute('data-i18n'));
        if (val) el.textContent = val;
    });
    // Placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const val = t(el.getAttribute('data-i18n-ph'));
        if (val) el.placeholder = val;
    });
    document.documentElement.lang = currentLang === 'vi' ? 'vi' : 'en';
}

function toggleLang() {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    localStorage.setItem('lang', currentLang);
    const btn = document.getElementById('langToggle');
    if (btn) btn.textContent = currentLang === 'vi' ? '🇻🇳' : '🇺🇸';
    applyTranslations();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'en' ? '🇺🇸 Switched to English' : '🇻🇳 Đã chuyển sang Tiếng Việt', 'info', 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('langToggle');
    if (btn) {
        btn.textContent = currentLang === 'vi' ? '🇻🇳' : '🇺🇸';
        btn.addEventListener('click', toggleLang);
    }
    applyTranslations();
});
