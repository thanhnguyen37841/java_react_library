
package com.example.demo.controller;

import com.example.demo.dto.response.BorrowResponse;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.BorrowService;
import com.example.demo.service.MemberService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;
import java.util.List;

import com.example.demo.service.MemberService;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.demo.service.SystemConfigService;



@WebMvcTest(UserBorrowController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserBorrowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BorrowService borrowService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @MockitoBean
    private SystemConfigService systemConfigService;

    @MockitoBean
    private MemberService memberService;

    @Test
    void getMyBorrowRecords_WithAuthenticatedPrincipal_Returns200()
            throws Exception {

        String email = "member@example.com";

        Page<BorrowResponse> emptyPage = new PageImpl<>(
                List.of(),
                PageRequest.of(0, 10),
                0
        );

        when(borrowService.searchMyBorrowRecords(
                eq(email),
                isNull(),
                isNull(),
                eq(0),
                eq(10)
        )).thenReturn(emptyPage);

        Principal principal = () -> email;

        mockMvc.perform(get("/api/borrows/my")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(borrowService).searchMyBorrowRecords(
                eq(email),
                isNull(),
                isNull(),
                eq(0),
                eq(10)
        );
    }

    @Test
    void getMyBorrowRecords_WithoutPrincipal_Returns401()
            throws Exception {

        mockMvc.perform(get("/api/borrows/my"))
                .andExpect(status().isUnauthorized());

        verify(borrowService, never()).searchMyBorrowRecords(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt()
        );
    }

    @Test
    void getMyBorrowRecords_NegativePage_Returns400()
            throws Exception {

        Principal principal = () -> "member@example.com";

        mockMvc.perform(get("/api/borrows/my")
                        .principal(principal)
                        .param("page", "-1"))
                .andExpect(status().isBadRequest());

        verify(borrowService, never()).searchMyBorrowRecords(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt()
        );
    }

    @Test
    void getMyBorrowRecords_PageSizeGreaterThan10_Returns400()
            throws Exception {

        Principal principal = () -> "member@example.com";

        mockMvc.perform(get("/api/borrows/my")
                        .principal(principal)
                        .param("size", "11"))
                .andExpect(status().isBadRequest());

        verify(borrowService, never()).searchMyBorrowRecords(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt()
        );
    }

    @Test
    void getMyBorrowRecords_PageSizeZero_Returns400()
            throws Exception {

        Principal principal = () -> "member@example.com";

        mockMvc.perform(get("/api/borrows/my")
                        .principal(principal)
                        .param("size", "0"))
                .andExpect(status().isBadRequest());

        verify(borrowService, never()).searchMyBorrowRecords(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt()
        );
    }

    @Test
    void getMyBorrowRecords_WithStatusAndKeyword_ForwardsFilters()
            throws Exception {

        String email = "member@example.com";
        String keyword = "Clean Code";
        BorrowStatus borrowStatus = BorrowStatus.BORROWING;

        Page<BorrowResponse> emptyPage = new PageImpl<>(
                List.of(),
                PageRequest.of(1, 5),
                0
        );

        when(borrowService.searchMyBorrowRecords(
                eq(email),
                eq(keyword),
                eq(borrowStatus),
                eq(1),
                eq(5)
        )).thenReturn(emptyPage);

        Principal principal = () -> email;

        mockMvc.perform(get("/api/borrows/my")
                        .principal(principal)
                        .param("keyword", keyword)
                        .param("status", borrowStatus.name())
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk());

        verify(borrowService).searchMyBorrowRecords(
                eq(email),
                eq(keyword),
                eq(borrowStatus),
                eq(1),
                eq(5)
        );
    }
}
