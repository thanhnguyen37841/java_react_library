package com.example.demo.controller;

import com.example.demo.dto.request.BookRequest;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.BookCoverService;
import com.example.demo.service.BookImportService;
import com.example.demo.service.BookService;
import com.example.demo.service.MemberService;
import com.example.demo.service.SystemConfigService;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookController.class)
@AutoConfigureMockMvc(addFilters = false)
class BookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();

    @MockitoBean
    private BookService bookService;

    @MockitoBean
    private BookImportService bookImportService;

    @MockitoBean
    private BookCoverService bookCoverService;

    @MockitoBean
    private MemberService memberService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private SystemConfigService systemConfigService;

    @Test
    void getBookById_ValidId_Returns200() throws Exception {
        BookResponse response = new BookResponse();
        response.setId(1L);
        response.setTitle("Clean Code");
        response.setAuthor("Robert C. Martin");
        response.setTotalQuantity(10);
        response.setAvailableQuantity(8);
        response.setCategoryName("Programming");
        response.setDescription("A practical programming book.");
        response.setPublisher("Prentice Hall");
        response.setPublicationYear(2008);
        response.setLanguage("English");
        response.setPageCount(464);

        when(bookService.getBookById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/books/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Clean Code"))
                .andExpect(jsonPath("$.author").value("Robert C. Martin"))
                .andExpect(jsonPath("$.totalQuantity").value(10))
                .andExpect(jsonPath("$.availableQuantity").value(8))
                .andExpect(jsonPath("$.categoryName").value("Programming"))
                .andExpect(jsonPath("$.description").value("A practical programming book."))
                .andExpect(jsonPath("$.publisher").value("Prentice Hall"))
                .andExpect(jsonPath("$.publicationYear").value(2008))
                .andExpect(jsonPath("$.language").value("English"))
                .andExpect(jsonPath("$.pageCount").value(464));
    }

    @Test
    void createBook_ValidRequest_Returns200() throws Exception {
        BookRequest request = new BookRequest();
        request.setTitle("Clean Code");
        request.setAuthor("Robert C. Martin");
        request.setTotalQuantity(10);
        request.setCategoryId(1L);
        request.setDescription("A practical programming book.");
        request.setPublisher("Prentice Hall");
        request.setPublicationYear(2008);
        request.setLanguage("English");
        request.setPageCount(464);

        BookResponse response = new BookResponse();
        response.setId(1L);
        response.setTitle("Clean Code");
        response.setAuthor("Robert C. Martin");
        response.setTotalQuantity(10);
        response.setAvailableQuantity(10);
        response.setCategoryName("Programming");
        response.setDescription(request.getDescription());
        response.setPublisher(request.getPublisher());
        response.setPublicationYear(request.getPublicationYear());
        response.setLanguage(request.getLanguage());
        response.setPageCount(request.getPageCount());

        when(bookService.createBook(any(BookRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Clean Code"))
                .andExpect(jsonPath("$.author").value("Robert C. Martin"))
                .andExpect(jsonPath("$.availableQuantity").value(10))
                .andExpect(jsonPath("$.description").value("A practical programming book."))
                .andExpect(jsonPath("$.publisher").value("Prentice Hall"))
                .andExpect(jsonPath("$.publicationYear").value(2008))
                .andExpect(jsonPath("$.language").value("English"))
                .andExpect(jsonPath("$.pageCount").value(464));
    }

    @Test
    void createBook_MissingTitle_Returns400() throws Exception {
        BookRequest request = new BookRequest();
        request.setAuthor("Robert C. Martin");
        request.setTotalQuantity(10);
        request.setCategoryId(1L);

        mockMvc.perform(post("/api/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Dữ liệu không hợp lệ"))
                .andExpect(jsonPath("$.fieldErrors.title")
                        .value("Tiêu đề không được để trống"));
    }

    @Test
    void deleteBook_ValidId_Returns200() throws Exception {
        doNothing().when(bookService).deleteBook(1L);

        mockMvc.perform(delete("/api/books/1"))
                .andExpect(status().isOk())
                .andExpect(content().string("Xóa sách thành công"));
    }

    @Test
    void getBookById_NotFound_Returns404() throws Exception {
        when(bookService.getBookById(anyLong()))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy sách"));

        mockMvc.perform(get("/api/books/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy sách"));
    }
}