package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

// GenerateRandomToken generates a secure random token of specified length
func GenerateRandomToken(length int) (string, error) {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash checks if a password matches its bcrypt hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// IsValidEmail checks if a string is a valid email address
func IsValidEmail(email string) bool {
	// A simple regex for email validation. More robust solutions might be needed for production.
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$`)
	return emailRegex.MatchString(email)
}

// GenerateRTSPURL generates an RTSP URL based on a template and NVR details
func GenerateRTSPURL(template string, username, password, ipAddress string, port, channelNumber int) string {
	url := template
	url = regexp.MustCompile(`\{username\}`).ReplaceAllString(url, username)
	url = regexp.MustCompile(`\{password\}`).ReplaceAllString(url, password)
	url = regexp.MustCompile(`\{ip\}`).ReplaceAllString(url, ipAddress)
	url = regexp.MustCompile(`\{port\}`).ReplaceAllString(url, fmt.Sprintf("%d", port))
	url = regexp.MustCompile(`\{channel_number\}`).ReplaceAllString(url, fmt.Sprintf("%d", channelNumber))
	return url
}
