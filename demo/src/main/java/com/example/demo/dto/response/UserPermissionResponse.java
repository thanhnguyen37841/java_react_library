package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserPermissionResponse {

    private Long permissionId;
    private String name;
    private String description;

    private boolean roleGranted;
    private Boolean overrideGranted;
    private boolean effectiveGranted;
}
