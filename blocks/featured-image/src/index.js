import "./index.scss"
import {useSelect, useDispatch} from '@wordpress/data';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import {useState, useEffect, useRef} from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import ImageUploader from "./image-uploader/image-uploader";
import Settings from "./settings/settings";
import {Button} from "@mui/material";

wp.blocks.registerBlockType("soli/featured-image", {
    title: "Soli Featured Image",
    icon: "cover-image",
    category: "development",
    supports: {
        align: true
    },
    attributes: {
        lock: {
            move: 'true',
            remove: 'true',
        }
    },
    edit: EditComponent,
    save: () => {
    },
})

function EditComponent() {
    const featuredImageId = useSelect((select) => select('core/editor').getEditedPostAttribute('featured_media'));
    const postCategories = useSelect((select) => select('core/editor').getEditedPostAttribute('categories')) ?? [];
    const [potentialImageId, setPotentialImageId] = useState();
    const [categories, setCategories] = useState([]);
    const {editPost} = useDispatch('core/editor');
    const internalUpdate = useRef(false);

    const onUpdateImage = (media) => {
        if (media) {
            editPost({featured_media: media.id});
        } else {
            editPost({featured_media: 0});
        }
    };

    const handleChange = (category, isChecked) => {
        internalUpdate.current = true;
        let updatedIds;
        if (isChecked) {
            updatedIds = [...postCategories, category.category_id];
        } else {
            updatedIds = postCategories.filter(id => id !== category.category_id);
        }

        editPost({categories: updatedIds});

        const selectedCats = categories.filter(c => updatedIds.includes(c.category_id));
        if (selectedCats.length > 0) {
            const randomImageId = selectRandomImage(selectedCats);
            setPotentialImageId(randomImageId);
            if (!featuredImageId) {
                refreshImage(randomImageId);
            }
        } else {
            setPotentialImageId(undefined);
        }
    };

    const selectRandomImage = (availableCategories) => {
        const catsWithImages = availableCategories.filter(c => c.image_id > 0);
        if (catsWithImages.length === 0) return undefined;
        const randomCat = catsWithImages[Math.floor(Math.random() * catsWithImages.length)];
        return randomCat.image_id;
    }

    const refreshImage = (id) => {
        editPost({featured_media: parseInt(id ?? potentialImageId ?? 0)});
    }

    const isNewImageAvailable = () => {
        return potentialImageId != null && featuredImageId != null && parseInt(potentialImageId) !== parseInt(featuredImageId);
    }

    const fetchCategories = () => {
        apiFetch({path: '/soli_featured_image/v1/category-images'})
            .then(response => {
                setCategories(response ?? []);
                if (response?.length > 0 && featuredImageId == null) {
                    const selectedCats = response.filter(c => postCategories.includes(c.category_id));
                    if (selectedCats.length > 0) {
                        refreshImage(selectRandomImage(selectedCats));
                    }
                }
            })
            .catch(error => console.error('Error fetching categories:', error));
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Bidirectional sync: when postCategories change externally (e.g. sidebar),
    // update the potential featured image
    useEffect(() => {
        if (internalUpdate.current) {
            internalUpdate.current = false;
            return;
        }
        if (categories.length === 0) return;

        const selectedCats = categories.filter(c => postCategories.includes(c.category_id));
        if (selectedCats.length > 0) {
            const randomImageId = selectRandomImage(selectedCats);
            setPotentialImageId(randomImageId);
            if (!featuredImageId) {
                refreshImage(randomImageId);
            }
        } else {
            setPotentialImageId(undefined);
        }
    }, [postCategories]);

    return (
        <div className="soli-featured-image">
            <Settings
                onSave={() => fetchCategories()}
            />
            <FormGroup className="group-options">
                {categories.sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
                    <FormControlLabel
                        key={category.category_id}
                        control={
                            <Checkbox
                                checked={postCategories.includes(category.category_id)}
                                onChange={(event) => handleChange(category, event.target.checked)}
                            />
                        }
                        label={category.name}
                    />
                ))}
            </FormGroup>
            {isNewImageAvailable() && <Button
                variant="secondary"
                onClick={() => refreshImage()}>
                Ververs afbeelding
            </Button>}
            <ImageUploader
                defaultImageId={featuredImageId}
                onChange={(media) => onUpdateImage(media)}
            />
        </div>
    );
}
