import "./index.scss"
import {useSelect, useDispatch} from '@wordpress/data';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import {useState, useEffect} from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import ImageUploader from "./image-uploader/image-uploader";
import Settings from "./settings/settings";
import {Button} from "@mui/material";

wp.blocks.registerBlockType("soli/featured-image", {
    title: "Soli Featured Image",
    icon: "cover-image",
    category: "development",
    supports: {
        // Declare support for block's alignment.
        // This adds support for all the options:
        // left, center, right, wide, and full.
        align: true
    },
    attributes: {
        selectedGroups: {
            type: 'array',
            default: []
        },
        lock: {
            move: 'true',
            remove: 'true',
        }
    },
    edit: EditComponent,
    save: () => {
    },
})

function EditComponent({attributes, setAttributes}) {
    const featuredImageId = useSelect((select) => select('core/editor').getEditedPostAttribute('featured_media'));
    const [potentialImageId, setPotentialImageId] = useState();
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [options, setOptions] = useState([]);
    const {editPost} = useDispatch('core/editor');

    const onUpdateImage = (media) => {
        if (media) {
            editPost({featured_media: media.id});
        } else {
            editPost({featured_media: 0});
        }
    };

    const handleChange = (changedOption, isChecked) => {
        let updatedSelectedOptions = [...selectedOptions];

        if (isChecked) {
            updatedSelectedOptions.push(changedOption);
        } else {
            updatedSelectedOptions = updatedSelectedOptions.filter(option => option.label !== changedOption.label);
        }

        setSelectedOptions(updatedSelectedOptions);
        // editPost({ meta: { soli_groups: updatedSelectedOptions } });
        setAttributes({...options, selectedGroups: updatedSelectedOptions.flatMap(option => option.label)})
        if (updatedSelectedOptions.length > 0) {
            const randomOptionId = selectRandomOption(updatedSelectedOptions);

            setPotentialImageId(randomOptionId);
            if (!featuredImageId) {
                refreshImage(randomOptionId)
            }
        } else {
            setPotentialImageId(undefined);
            editPost({featured_media: 0});
        }
    };

    const selectRandomOption = (availableOptions) => {
        const optionsWithValues = availableOptions.filter(option => option.value !== '');
        const randomOption = optionsWithValues[Math.floor(Math.random() * optionsWithValues.length)];

        return randomOption?.value;
    }

    const refreshImage = (id) => {
        editPost({featured_media: parseInt(id ?? potentialImageId ?? 0)});
    }

    const isNewImageAvailable = () => {
        return potentialImageId != null && featuredImageId != null && parseInt(potentialImageId) !== parseInt(featuredImageId);
    }

    const refreshOptions = (newOptions) => {
        setSelectedOptions(newOptions.filter(o => attributes.selectedGroups?.includes(o.label)) ?? [])
        setOptions(newOptions?.length ? newOptions : [])

        if(newOptions?.length > 0 && featuredImageId == null){
            refreshImage(selectRandomOption(newOptions));
        }
    }

    useEffect(() => {
        apiFetch({path: '/soli_featured_image/v1/options'})
            .then(response => refreshOptions(response))
            .catch(error => console.error('Error fetching options:', error));
    }, []);

    return (
        <div className="soli-featured-image">
            <Settings
                options={options}
                onChange={(newOptions) =>  refreshOptions(newOptions)}
            />
            <FormGroup className="group-options">
                {options.sort().map((option, i) => (
                    <FormControlLabel
                        key={i}
                        control={
                            <Checkbox
                                checked={selectedOptions?.flatMap(o => o.label).includes(option.label)}
                                onChange={(event) => handleChange(option, event.target.checked)}
                                value={option}
                            />
                        }
                        label={option.label}
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


