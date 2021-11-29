mongoimport -d sdcrandr -c reviews --headerline --columnsHaveTypes --type='csv' /seed/reviews.csv
mongoimport -d sdcrandr -c reviews_photos --headerline --columnsHaveTypes --type='csv' /seed/reviews_photos.csv
mongoimport -d sdcrandr -c characteristics --headerline --columnsHaveTypes --type='csv' /seed/characteristics.csv
mongoimport -d sdcrandr -c characteristic_reviews --headerline --columnsHaveTypes --type='csv' /seed/characteristic_reviews.csv