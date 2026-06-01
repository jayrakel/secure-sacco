package com.jaytechwave.sacco.modules.public_content.domain.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.jaytechwave.sacco.modules.public_content.api.dto.PublicContentDTOs.PhotoUploadResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Handles Cloudinary photo uploads.
 * Kept separate from PublicService so that Cloudinary is an optional
 * dependency — if CLOUDINARY_URL is not configured the bean won't exist
 * but PublicService still starts cleanly.
 */
@Slf4j
@Service
public class CloudinaryUploadService {

    @Autowired(required = false)
    private Cloudinary cloudinary;

    public PhotoUploadResponse uploadSpotlightPhoto(MultipartFile file) {
        if (cloudinary == null) {
            throw new UnsupportedOperationException(
                    "Cloudinary is not configured. Set CLOUDINARY_URL in Doppler/environment.");
        }
        try {
            var result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder",          "sacco/spotlights",
                            "transformation",  "w_400,h_400,c_fill,g_face,q_auto",
                            "resource_type",   "image"
                    )
            );
            String url      = (String) result.get("secure_url");
            String publicId = (String) result.get("public_id");
            log.info("Cloudinary upload success: publicId={}", publicId);
            return new PhotoUploadResponse(url, publicId);
        } catch (Exception e) {
            log.error("Cloudinary upload failed: {}", e.getMessage());
            throw new RuntimeException("Failed to upload photo: " + e.getMessage(), e);
        }
    }
}