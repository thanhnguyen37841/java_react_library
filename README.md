# Java React Library

Ứng dụng quản lý thư viện được xây dựng với **Spring Boot (Backend)** và
**React (Frontend)**. Dự án hỗ trợ quản lý tài khoản, phân quyền, sách,
thành viên, mượn/trả sách và một số chức năng quản trị hệ thống.

> Tài liệu này hướng dẫn chuẩn bị môi trường, cấu hình và chạy dự án.
> Các giá trị cấu hình như tên database, tài khoản database, cổng chạy
> và tài khoản quản trị cần đối chiếu với file cấu hình thực tế trong mã
> nguồn trước khi sử dụng.

## 1. Công nghệ sử dụng

### Backend

-   Java 17
-   Spring Boot
-   Spring Security và JWT
-   Spring Data JPA / Hibernate
-   MySQL
-   Liquibase
-   Maven

### Frontend

-   React
-   JavaScript
-   npm

## 2. Cấu trúc thư mục

``` text
java_react_library/
├── demo/                 # Mã nguồn Backend Spring Boot
└── library-frontend/     # Mã nguồn Frontend React
```

## 3. Yêu cầu môi trường

Cài đặt các công cụ sau trước khi chạy dự án:

-   JDK 17
-   Maven (hoặc Maven Wrapper nếu dự án có cung cấp)
-   MySQL Server
-   Node.js phiên bản LTS và npm
-   Git

Kiểm tra cài đặt:

``` bash
java -version
mvn -version
node -v
npm -v
```

Đảm bảo Maven đang sử dụng **JDK 17**, không phải một phiên bản JDK
khác. Nếu máy có nhiều JDK, kiểm tra biến `JAVA_HOME` và cấu hình Java
mà IDE đang sử dụng.

## 4. Cấu hình cơ sở dữ liệu

1.  Khởi động MySQL Server.
2.  Tạo database dành riêng cho dự án.
3.  Mở cấu hình Backend trong thư mục `demo/src/main/resources/`. Tìm
    `application.properties` hoặc `application.yml` (và các file cấu
    hình theo profile nếu có).
4.  Cập nhật thông tin kết nối MySQL theo môi trường của bạn.

Ví dụ cấu hình tham khảo --- thay các giá trị trong dấu `<...>` bằng
thông tin thực tế:

``` properties
spring.datasource.url=jdbc:mysql://localhost:3306/<database_name>?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh
spring.datasource.username=<mysql_username>
spring.datasource.password=<mysql_password>
```

**Lưu ý:** - Tên database phải trùng với database bạn đã tạo. - Tài
khoản MySQL cần có quyền truy cập database đó. - Kiểm tra cấu hình
Liquibase trong dự án. Khi được bật và cấu hình đúng, Liquibase sẽ quản
lý việc áp dụng các changeset tạo/cập nhật cấu trúc dữ liệu. - Không tự
ý xóa database hoặc chạy lại các script khởi tạo trên database đang có
dữ liệu quan trọng. - Không commit mật khẩu, JWT secret, email password
hoặc thông tin nhạy cảm lên GitHub. Nên dùng biến môi trường hoặc file
cấu hình riêng không đưa vào Git.

## 5. Chạy Backend

Mở Terminal tại thư mục Backend:

``` bash
cd demo
```

Chạy ứng dụng bằng Maven:

``` bash
mvn spring-boot:run
```

Nếu dự án có Maven Wrapper, có thể dùng:

**Windows:**

``` powershell
.\mvnw.cmd spring-boot:run
```

**Linux / macOS:**

``` bash
./mvnw spring-boot:run
```

Đợi đến khi log cho biết Spring Boot đã khởi động thành công. Nếu không
khởi động được, kiểm tra lần lượt: - MySQL đã chạy và thông tin kết nối
chính xác chưa. - JDK đang dùng có phải Java 17 không. - Cổng ứng dụng
có bị chương trình khác chiếm dụng không. - Các biến môi trường và cấu
hình JWT/email (nếu chức năng tương ứng yêu cầu) đã được khai báo chưa.

## 6. Chạy Frontend

Mở một Terminal khác tại thư mục Frontend:

``` bash
cd library-frontend
npm install
```

Sau đó chạy lệnh phát triển được khai báo trong `package.json`. Với dự
án dùng script `dev`, lệnh thường là:

``` bash
npm run dev
```

Nếu lệnh trên không tồn tại, mở `package.json`, kiểm tra mục `scripts`
và chạy đúng script được định nghĩa tại đó.

Mở địa chỉ Local được hiển thị trong Terminal bằng trình duyệt. Không tự
giả định cổng Frontend; sử dụng đúng địa chỉ mà công cụ chạy dự án cung
cấp.

### Kết nối Frontend với Backend

Kiểm tra file cấu hình API của Frontend (ví dụ file `.env`, cấu hình
Axios hoặc file chứa `baseURL`). Đảm bảo địa chỉ Backend và cấu hình
proxy/API phù hợp với môi trường đang chạy.

Nếu dự án sử dụng biến môi trường Vite, tên biến phía trình duyệt thường
cần tiền tố `VITE_`. Hãy ưu tiên tên biến đã được mã nguồn sử dụng,
không tự đổi tên biến nếu chưa cập nhật các vị trí tham chiếu.

## 7. Các nhóm chức năng chính

Các chức năng được triển khai trong dự án bao gồm:

-   **Tài khoản và xác thực:** đăng nhập, đăng xuất, làm mới token, đăng
    ký và xác minh email.
-   **Quản lý tài khoản:** quên mật khẩu, đặt lại/đổi mật khẩu và yêu
    cầu thay đổi email qua bước xác minh.
-   **Phân quyền:** kiểm soát quyền truy cập theo vai trò/nhóm quyền.
-   **Quản lý sách:** thêm, xem, cập nhật, xóa, tìm kiếm, phân trang và
    nhập dữ liệu CSV.
-   **Quản lý thành viên:** quản lý thông tin, tìm kiếm và phân trang.
-   **Mượn/trả sách:** quản lý phiếu mượn và trạng thái mượn/trả.
-   **Quản lý dữ liệu đã xóa:** xem dữ liệu trong thùng rác và khôi phục
    khi được hỗ trợ.
-   **Maintenance Mode:** tạm khóa các chức năng hệ thống trong thời
    gian bảo trì theo quy tắc được cấu hình.

Quyền truy cập cụ thể phụ thuộc vào tài khoản và nhóm quyền được cấp.

## 8. Hướng dẫn sử dụng và lưu ý

### Đăng nhập và tài khoản

-   Sử dụng tài khoản đã được tạo hoặc được cấp bởi người quản trị.
-   Nếu hệ thống yêu cầu xác minh email, hoàn tất xác minh trước khi
    đăng nhập.
-   Không chia sẻ mật khẩu, access token hoặc refresh token.
-   Khi sử dụng máy tính công cộng, hãy đăng xuất sau khi hoàn tất công
    việc.

### Quản lý sách và thành viên

-   Kiểm tra thông tin trước khi thêm hoặc cập nhật dữ liệu.
-   Khi nhập CSV, cần bảo đảm file đúng định dạng/cột dữ liệu mà chức
    năng import yêu cầu.
-   Nên kiểm tra dữ liệu sau khi nhập để phát hiện dòng lỗi hoặc thông
    tin không hợp lệ.
-   Thao tác xóa/khôi phục cần thực hiện đúng quyền được cấp.

### Mượn và trả sách

-   Kiểm tra thông tin thành viên, sách và trạng thái phiếu trước khi
    xác nhận thao tác.
-   Không tự sửa dữ liệu trực tiếp trong database khi ứng dụng đang hoạt
    động.
-   Nếu trạng thái hiển thị không như mong đợi, tải lại dữ liệu và kiểm
    tra lịch sử/thông tin phiếu trước khi thao tác lần nữa.

### Maintenance Mode

-   Khi bật chế độ bảo trì, một số API/chức năng thông thường có thể trả
    về HTTP 503.
-   Theo thiết kế hiện tại, luồng đăng nhập được cho phép đi qua để
    người có quyền quản trị có thể đăng nhập và tắt chế độ bảo trì.
-   Chỉ tài khoản có quyền phù hợp mới được phép thay đổi cấu hình bảo
    trì. Không chia sẻ tài khoản quản trị.
-   Sau khi bảo trì, kiểm tra lại các chức năng chính trước khi cho
    người dùng tiếp tục sử dụng.

### Bảo mật và dữ liệu

-   Không đưa file `.env`, mật khẩu, JWT secret, khóa API hoặc thông tin
    SMTP vào repository công khai.
-   Không dùng dữ liệu thật/nhạy cảm khi thử nghiệm nếu chưa có biện
    pháp bảo vệ phù hợp.
-   Sao lưu database trước khi cập nhật cấu trúc dữ liệu hoặc thử nghiệm
    thao tác có thể ảnh hưởng nhiều bản ghi.
-   Không chỉnh sửa trực tiếp dữ liệu trong database để thay thế các
    thao tác nghiệp vụ của ứng dụng.
-   Chỉ cấp quyền tối thiểu cần thiết cho từng loại tài khoản.

## 9. Chạy kiểm thử Backend

Mở Terminal tại thư mục `demo`:

``` bash
mvn test
```

Nếu dự án dùng Maven Wrapper:

**Windows:**

``` powershell
.\mvnw.cmd test
```

**Linux / macOS:**

``` bash
./mvnw test
```

Kết quả kiểm thử phụ thuộc vào mã nguồn và môi trường tại thời điểm
chạy. Một lần chạy test thành công không thay thế cho việc kiểm tra tích
hợp với MySQL và kiểm thử các luồng thực tế trên giao diện.

## 10. Một số lỗi thường gặp

  -----------------------------------------------------------------------
  Hiện tượng                          Hướng kiểm tra
  ----------------------------------- -----------------------------------
  Backend không kết nối được MySQL    Kiểm tra MySQL service, host, port,
                                      tên database, username và password

  Maven báo sai phiên bản Java        Kiểm tra `java -version`,
                                      `mvn -version` và `JAVA_HOME`; dùng
                                      JDK 17

  Frontend không gọi được API         Kiểm tra Backend đã chạy chưa,
                                      `baseURL`/proxy, cổng và cấu hình
                                      CORS

  API trả về 401 Unauthorized         Kiểm tra trạng thái đăng nhập,
                                      access token và header
                                      Authorization

  API trả về 403 Forbidden            Kiểm tra vai trò, nhóm quyền và
                                      quyền truy cập endpoint

  API trả về 503 Service Unavailable  Kiểm tra Maintenance Mode

  Không gửi/nhận được email           Kiểm tra cấu hình SMTP, thông tin
                                      xác thực và quyền truy cập của nhà
                                      cung cấp email

  Frontend thiếu package              Chạy `npm install` trong thư mục
                                      `library-frontend`
  -----------------------------------------------------------------------

## 11. Quy trình khởi động nhanh

Mỗi lần chạy dự án trên máy cá nhân:

1.  Khởi động MySQL.
2.  Mở Terminal thứ nhất, vào `demo` và chạy Backend.
3.  Mở Terminal thứ hai, vào `library-frontend`, cài dependencies nếu
    cần và chạy Frontend.
4.  Mở địa chỉ Frontend được hiển thị trong Terminal.
5.  Đăng nhập bằng tài khoản hợp lệ và kiểm tra quyền sử dụng.

Khi dừng dự án, dừng tiến trình Frontend và Backend trong các Terminal
tương ứng. Không tắt MySQL khi ứng dụng vẫn đang cần kết nối cơ sở dữ
liệu.

------------------------------------------------------------------------

## Ghi chú

Tài liệu này mô tả cách chạy và các nhóm chức năng ở mức tổng quan.
Trước khi triển khai trên máy khác hoặc môi trường production, cần đối
chiếu lại cấu hình thực tế trong
`application.properties`/`application.yml`, `pom.xml`, `package.json`,
file cấu hình API và cấu hình biến môi trường của dự án.
