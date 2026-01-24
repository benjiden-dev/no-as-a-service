Place your custom font files (.ttf, .otf) in this directory.
Rebuild the container to apply changes:
  docker compose up -d --build
Then set the font family name in your .env file:
  IMG_FONT_FAMILY="My Custom Font Name"
