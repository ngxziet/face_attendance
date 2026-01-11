"""
Face recognition service utilities
"""
import face_recognition
import numpy as np
from typing import Optional, List, Tuple
from app.config import FACE_RECOGNITION_THRESHOLD


def extract_encoding_from_image(image_path: str) -> Optional[np.ndarray]:
    """
    Extract face encoding from an image file
    
    Args:
        image_path: Path to the image file
        
    Returns:
        numpy array of 128-dim encoding or None if no face found
    """
    try:
        # Load image
        image = face_recognition.load_image_file(image_path)
        
        # Find face encodings
        encodings = face_recognition.face_encodings(image)
        
        if len(encodings) > 0:
            return encodings[0]  # Return first face found
        return None
    except Exception as e:
        print(f"Error extracting encoding: {e}")
        return None


def extract_encoding_from_bytes(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Extract face encoding from image bytes
    
    Args:
        image_bytes: Image file bytes
        
    Returns:
        numpy array of 128-dim encoding or None if no face found
    """
    try:
        import io
        from PIL import Image
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        image_array = np.array(image)
        
        # Try to find face with different settings
        # Use consistent model (large) for better accuracy and consistency with recognition
        # First try with default settings but use large model
        encodings = face_recognition.face_encodings(image_array, num_jitters=1, model='large')
        
        # If no face found, try with upsampling (helps with smaller faces)
        if len(encodings) == 0:
            # Try to detect face locations first with upsampling
            face_locations = face_recognition.face_locations(image_array, model='hog', number_of_times_to_upsample=2)
            if len(face_locations) > 0:
                encodings = face_recognition.face_encodings(image_array, face_locations, num_jitters=1, model='large')
        
        # If still no face, try with CNN model (more accurate but slower)
        if len(encodings) == 0:
            face_locations = face_recognition.face_locations(image_array, model='cnn')
            if len(face_locations) > 0:
                encodings = face_recognition.face_encodings(image_array, face_locations, num_jitters=1, model='large')
        
        if len(encodings) > 0:
            return encodings[0]  # Return first face found
        return None
    except Exception as e:
        print(f"Error extracting encoding from bytes: {e}")
        import traceback
        traceback.print_exc()
        return None


def compare_encodings(encoding1: np.ndarray, encoding2: np.ndarray) -> float:
    """
    Calculate distance between two face encodings
    
    Args:
        encoding1: First face encoding
        encoding2: Second face encoding
        
    Returns:
        Distance value (lower = more similar)
    """
    return float(face_recognition.face_distance([encoding1], encoding2)[0])


def find_best_match(
    target_encoding: np.ndarray,
    known_encodings: List[np.ndarray],
    threshold: float = FACE_RECOGNITION_THRESHOLD
) -> Optional[Tuple[int, float]]:
    """
    Find the best matching face encoding
    
    Args:
        target_encoding: Encoding to match
        known_encodings: List of known encodings
        threshold: Maximum distance for a match
        
    Returns:
        Tuple of (index, distance) or None if no match found
    """
    if len(known_encodings) == 0:
        return None
    
    # Calculate distances
    distances = face_recognition.face_distance(known_encodings, target_encoding)
    
    # Find best match
    best_match_index = np.argmin(distances)
    best_distance = distances[best_match_index]
    
    # Check if within threshold
    if best_distance < threshold:
        return (int(best_match_index), float(best_distance))
    
    return None
